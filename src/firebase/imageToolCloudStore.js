import { deleteDoc, doc, getDoc, setDoc } from 'firebase/firestore';
import { deleteObject, getDownloadURL, listAll, ref, uploadString } from 'firebase/storage';
import {
  auth,
  db,
  ensureFirebaseAuthPersistence,
  isFirebaseConfigured,
  storage,
  waitForAuthReady,
} from './client';

const SNAPSHOT_COLLECTION = 'imageToolSnapshots';
const IMAGE_ROOT = 'image-tool';
const RESULT_UPLOAD_WORKERS = 3;

const uploadUrlCache = new Map();

function timestampOf(isoText) {
  if (typeof isoText !== 'string') return 0;
  const parsed = Date.parse(isoText);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function isDataUrl(text) {
  return typeof text === 'string' && text.startsWith('data:image/');
}

function mimeTypeFromDataUrl(dataUrl) {
  const match = String(dataUrl).match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,/);
  return match?.[1] || 'image/png';
}

function cacheKeyForResult(uid, mode, result) {
  const url = String(result?.url || '');
  const head = url.slice(0, 40);
  const tail = url.slice(-40);
  return `${uid}:${mode}:${result?.id || 'unknown'}:${url.length}:${head}:${tail}`;
}

function docRefFor(uid, mode) {
  return doc(db, 'users', uid, SNAPSHOT_COLLECTION, mode);
}

async function ensureUid() {
  if (!isFirebaseConfigured || !auth) return null;
  await ensureFirebaseAuthPersistence();
  await waitForAuthReady();
  if (auth.currentUser?.uid) return auth.currentUser.uid;
  return null;
}

async function uploadResultIfNeeded(uid, mode, result) {
  if (!storage || !result || typeof result !== 'object') return result;
  if (!isDataUrl(result.url)) return result;

  const cacheKey = cacheKeyForResult(uid, mode, result);
  const cached = uploadUrlCache.get(cacheKey);
  if (cached) {
    return { ...result, url: cached.url, storagePath: cached.storagePath };
  }

  const ext = mimeTypeFromDataUrl(result.url).includes('jpeg') ? 'jpg' : 'png';
  const storagePath = result.storagePath || `users/${uid}/${IMAGE_ROOT}/${mode}/${result.id}.${ext}`;
  const storageRef = ref(storage, storagePath);

  await uploadString(storageRef, result.url, 'data_url', {
    contentType: mimeTypeFromDataUrl(result.url),
    cacheControl: 'public,max-age=31536000',
  });

  const downloadUrl = await getDownloadURL(storageRef);
  uploadUrlCache.set(cacheKey, { url: downloadUrl, storagePath });

  return { ...result, url: downloadUrl, storagePath };
}

async function uploadResults(uid, mode, results) {
  if (!Array.isArray(results) || results.length === 0) return [];

  const normalized = [...results];
  const total = normalized.length;
  let cursor = 0;
  const workers = Math.min(RESULT_UPLOAD_WORKERS, total);

  async function worker() {
    while (cursor < total) {
      const index = cursor;
      cursor += 1;
      const result = normalized[index];
      try {
        normalized[index] = await uploadResultIfNeeded(uid, mode, result);
      } catch (err) {
        console.warn('[firebase] image upload failed:', err?.message || err);
        normalized[index] = result;
      }
    }
  }

  await Promise.all(Array.from({ length: workers }, () => worker()));
  return normalized;
}

function safeResultsArray(value) {
  return Array.isArray(value) ? value : [];
}

function extractStoragePaths(results) {
  if (!Array.isArray(results)) return [];
  return results
    .map((item) => item?.storagePath)
    .filter((path) => typeof path === 'string' && path.length > 0);
}

export async function loadCloudSnapshot(mode) {
  if (!isFirebaseConfigured || !db) return null;
  const uid = await ensureUid();
  if (!uid) return null;

  try {
    const snap = await getDoc(docRefFor(uid, mode));
    if (!snap.exists()) return null;
    return { mode, ...snap.data() };
  } catch (err) {
    console.warn('[firebase] load snapshot failed:', err?.message || err);
    return null;
  }
}

export async function saveCloudSnapshot(mode, record) {
  if (!isFirebaseConfigured || !db) return null;
  const uid = await ensureUid();
  if (!uid) return null;
  const snapshotRef = docRefFor(uid, mode);

  let previousPaths = [];
  try {
    const previous = await getDoc(snapshotRef);
    if (previous.exists()) {
      previousPaths = extractStoragePaths(previous.data()?.results);
    }
  } catch (err) {
    console.warn('[firebase] previous snapshot read failed:', err?.message || err);
  }

  const uploadedResults = await uploadResults(uid, mode, safeResultsArray(record?.results));
  const cloudResults = uploadedResults.filter((item) => !isDataUrl(item?.url));
  if (uploadedResults.length > 0 && cloudResults.length === 0) {
    console.warn('[firebase] Storage upload did not persist any result URLs. Check Storage initialization, bucket name, and rules.');
  }

  const payload = {
    ...record,
    mode,
    results: cloudResults,
    localOnlyPendingCount: Math.max(0, uploadedResults.length - cloudResults.length),
    updatedAt: new Date().toISOString(),
  };

  try {
    await setDoc(snapshotRef, payload, { merge: true });

    const nextPathSet = new Set(extractStoragePaths(payload.results));
    const stalePaths = previousPaths.filter((path) => !nextPathSet.has(path));
    if (stalePaths.length > 0) {
      await Promise.all(stalePaths.map((path) => deleteObject(ref(storage, path)).catch(() => undefined)));
    }
    return payload;
  } catch (err) {
    console.warn('[firebase] save snapshot failed:', err?.message || err);
    return null;
  }
}

export async function clearCloudSnapshot(mode) {
  if (!isFirebaseConfigured || !db) return;
  const uid = await ensureUid();
  if (!uid) return;

  try {
    const snapshotRef = docRefFor(uid, mode);
    const snap = await getDoc(snapshotRef);

    if (snap.exists() && Array.isArray(snap.data()?.results)) {
      const deletions = snap.data().results
        .map((item) => item?.storagePath)
        .filter((path) => typeof path === 'string' && path.length > 0)
        .map((path) => deleteObject(ref(storage, path)).catch(() => undefined));
      await Promise.all(deletions);
    }

    try {
      const folderRef = ref(storage, `users/${uid}/${IMAGE_ROOT}/${mode}`);
      const listed = await listAll(folderRef);
      await Promise.all(listed.items.map((itemRef) => deleteObject(itemRef).catch(() => undefined)));
    } catch {
      // list 권한이 없거나 폴더가 없어도 무시
    }

    await deleteDoc(snapshotRef);
  } catch (err) {
    console.warn('[firebase] clear snapshot failed:', err?.message || err);
  }
}

export function pickLatestSnapshot(localSnapshot, cloudSnapshot) {
  if (!localSnapshot) return cloudSnapshot;
  if (!cloudSnapshot) return localSnapshot;
  return timestampOf(cloudSnapshot.updatedAt) >= timestampOf(localSnapshot.updatedAt)
    ? cloudSnapshot
    : localSnapshot;
}
