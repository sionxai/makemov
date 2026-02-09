import { openDB } from 'idb';
import {
  clearCloudSnapshot,
  loadCloudSnapshot,
  pickLatestSnapshot,
  saveCloudSnapshot,
} from '../firebase/imageToolCloudStore';

const DB_NAME = 'makemov_image_tool';
const DB_VERSION = 1;
const STORE_NAME = 'snapshots';
const MAX_RESULTS = 40;
const CLOUD_SAVE_DEBOUNCE_MS = 1200;
const RESULT_RETENTION_DAYS = 7;
const RESULT_RETENTION_MS = RESULT_RETENTION_DAYS * 24 * 60 * 60 * 1000;
export const IMAGE_TOOL_RETENTION_DAYS = RESULT_RETENTION_DAYS;

const pendingCloudRecords = new Map();
const pendingCloudTimers = new Map();
const cloudSyncInFlight = new Map();
const modeVersionMap = new Map();

async function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'mode' });
      }
    },
  });
}

function modeVersion(mode) {
  return modeVersionMap.get(mode) || 0;
}

function sanitizeResults(results) {
  if (!Array.isArray(results)) return [];
  return results
    .filter((item) => item && typeof item.id === 'string' && typeof item.url === 'string')
    .slice(-MAX_RESULTS)
    .map((item) => ({
      id: item.id,
      label: typeof item.label === 'string' ? item.label : '결과',
      url: item.url,
      ...(typeof item.prompt === 'string' ? { prompt: item.prompt } : {}),
      ...(typeof item.storagePath === 'string' ? { storagePath: item.storagePath } : {}),
      ...(typeof item.createdAt === 'string' ? { createdAt: item.createdAt } : {}),
      ...(typeof item.updatedAt === 'string' ? { updatedAt: item.updatedAt } : {}),
      pinned: Boolean(item.pinned),
    }));
}

function sanitizePromptOverrides(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const next = {};
  Object.entries(value).forEach(([key, prompt]) => {
    if (!/^\d+$/.test(key)) return;
    if (typeof prompt !== 'string') return;
    if (!prompt.trim()) return;
    next[key] = prompt;
  });
  return next;
}

function sanitizeWorkerCount(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) return 4;
  if (value <= 3) return 3;
  if (value >= 5) return 5;
  return 4;
}

function buildRecord(mode, payload) {
  return {
    mode,
    ratio: typeof payload?.ratio === 'string' ? payload.ratio : '',
    workerCount: sanitizeWorkerCount(payload?.workerCount),
    additionalPrompt: typeof payload?.additionalPrompt === 'string' ? payload.additionalPrompt : '',
    selectedId: typeof payload?.selectedId === 'string' ? payload.selectedId : null,
    results: sanitizeResults(payload?.results),
    promptOverrides: sanitizePromptOverrides(payload?.promptOverrides),
    updatedAt: new Date().toISOString(),
  };
}

function hasExpired(result, nowMs) {
  if (!result || result.pinned) return false;
  if (typeof result.createdAt !== 'string') return false;
  const createdAtMs = Date.parse(result.createdAt);
  if (Number.isNaN(createdAtMs)) return false;
  return nowMs - createdAtMs > RESULT_RETENTION_MS;
}

function applyRetentionPolicy(record) {
  const nowMs = Date.now();
  const filtered = Array.isArray(record.results)
    ? record.results.filter((result) => !hasExpired(result, nowMs))
    : [];

  const selectedId = filtered.some((result) => result.id === record.selectedId)
    ? record.selectedId
    : null;

  return {
    ...record,
    selectedId,
    results: filtered,
    retentionDays: RESULT_RETENTION_DAYS,
  };
}

function snapshotSignature(snapshot) {
  if (!snapshot) return '';
  return JSON.stringify({
    mode: snapshot.mode,
    ratio: snapshot.ratio,
    workerCount: snapshot.workerCount,
    additionalPrompt: snapshot.additionalPrompt,
    selectedId: snapshot.selectedId,
    promptOverrides: snapshot.promptOverrides || {},
    retentionDays: snapshot.retentionDays,
    results: snapshot.results || [],
  });
}

function scheduleCloudSync(mode, record) {
  pendingCloudRecords.set(mode, { record, version: modeVersion(mode) });

  const existingTimer = pendingCloudTimers.get(mode);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  const timer = setTimeout(() => {
    pendingCloudTimers.delete(mode);
    void flushCloudSync(mode);
  }, CLOUD_SAVE_DEBOUNCE_MS);

  pendingCloudTimers.set(mode, timer);
}

async function flushCloudSync(mode) {
  if (cloudSyncInFlight.get(mode)) return;

  const pending = pendingCloudRecords.get(mode);
  if (!pending) return;

  pendingCloudRecords.delete(mode);
  cloudSyncInFlight.set(mode, true);

  try {
    const cloudRecord = await saveCloudSnapshot(mode, pending.record);
    if (!cloudRecord) return;

    // clear 이후에 늦게 완료된 sync는 무시
    if (pending.version !== modeVersion(mode)) return;
  } catch (err) {
    console.warn('[imageTool] cloud sync failed:', err?.message || err);
  } finally {
    cloudSyncInFlight.delete(mode);
    if (pendingCloudRecords.has(mode)) {
      const latest = pendingCloudRecords.get(mode);
      if (latest) {
        scheduleCloudSync(mode, latest.record);
      }
    }
  }
}

export async function loadImageToolSnapshot(mode) {
  const db = await getDB();
  const localSnapshot = await db.get(STORE_NAME, mode);
  const cloudSnapshot = await loadCloudSnapshot(mode);
  const chosen = pickLatestSnapshot(localSnapshot, cloudSnapshot);
  const retained = chosen ? applyRetentionPolicy(chosen) : null;
  const changedByRetention = snapshotSignature(retained) !== snapshotSignature(chosen);
  const differsFromLocal = snapshotSignature(retained) !== snapshotSignature(localSnapshot);

  if (retained && differsFromLocal) {
    await db.put(STORE_NAME, retained);
  }
  if (retained && changedByRetention) {
    scheduleCloudSync(mode, retained);
  }

  return retained || null;
}

export async function saveImageToolSnapshot(mode, payload) {
  const db = await getDB();
  const record = applyRetentionPolicy(buildRecord(mode, payload));
  await db.put(STORE_NAME, record);
  scheduleCloudSync(mode, record);
  return record;
}

export async function clearImageToolSnapshot(mode) {
  modeVersionMap.set(mode, modeVersion(mode) + 1);

  const timer = pendingCloudTimers.get(mode);
  if (timer) {
    clearTimeout(timer);
    pendingCloudTimers.delete(mode);
  }
  pendingCloudRecords.delete(mode);

  const db = await getDB();
  await db.delete(STORE_NAME, mode);
  await clearCloudSnapshot(mode);
}
