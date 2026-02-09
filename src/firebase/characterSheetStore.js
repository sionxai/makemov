import { collection, collectionGroup, deleteDoc, doc, getDocs, limit, query, setDoc } from 'firebase/firestore';
import { deleteObject, getDownloadURL, getMetadata, listAll, ref, uploadBytes } from 'firebase/storage';
import {
  auth,
  db,
  ensureFirebaseAuthPersistence,
  isFirebaseConfigured,
  storage,
  waitForAuthReady,
} from './client';

const SHEET_COLLECTION = 'characterSheets';
const SHEET_ROOT = 'character-sheets';
const ENABLE_LEGACY_STORAGE_PATH_SCAN = import.meta.env.VITE_ENABLE_LEGACY_STORAGE_PATH_SCAN === '1';
const ENABLE_STORAGE_LIST_RECOVERY = import.meta.env.VITE_ENABLE_STORAGE_LIST_RECOVERY === '1';

function generateId() {
  return `sheet_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeName(name) {
  if (typeof name !== 'string') return 'character-sheet';
  const trimmed = name.trim();
  return trimmed || 'character-sheet';
}

function normalizeDescription(description) {
  if (typeof description !== 'string') return '';
  return description.trim().slice(0, 240);
}

function parseTime(isoText) {
  const parsed = Date.parse(isoText || '');
  return Number.isNaN(parsed) ? 0 : parsed;
}

function sortRows(rows) {
  const next = Array.isArray(rows) ? [...rows] : [];
  next.sort((a, b) => parseTime(b.createdAt) - parseTime(a.createdAt));
  return next;
}

function mimeFromName(name) {
  const lower = String(name || '').toLowerCase();
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.gif')) return 'image/gif';
  return 'image/png';
}

function idFromFileName(fileName) {
  const normalized = String(fileName || '').trim();
  if (!normalized) return generateId();
  const dot = normalized.lastIndexOf('.');
  if (dot > 0) return normalized.slice(0, dot);
  return normalized;
}

function safeExtFromFile(file) {
  if (typeof file?.name === 'string') {
    const dot = file.name.lastIndexOf('.');
    if (dot > -1 && dot < file.name.length - 1) {
      return file.name.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, '') || 'png';
    }
  }
  if (typeof file?.type === 'string' && file.type.includes('jpeg')) return 'jpg';
  if (typeof file?.type === 'string' && file.type.includes('webp')) return 'webp';
  return 'png';
}

async function ensureUid() {
  if (!isFirebaseConfigured || !auth) return null;
  await ensureFirebaseAuthPersistence();
  await waitForAuthReady();
  if (auth.currentUser?.uid) return auth.currentUser.uid;
  return null;
}

function sheetCollectionRef(uid) {
  return collection(db, 'users', uid, SHEET_COLLECTION);
}

function ownerUidFromPath(pathText) {
  const parts = String(pathText || '').split('/');
  const usersIndex = parts.indexOf('users');
  if (usersIndex === -1) return '';
  return parts[usersIndex + 1] || '';
}

function normalizeRow(row) {
  return {
    id: row.id,
    ownerUid: String(row.ownerUid || ''),
    name: normalizeName(row.name),
    description: normalizeDescription(row.description),
    url: String(row.url || ''),
    storagePath: String(row.storagePath || ''),
    mimeType: String(row.mimeType || 'image/png'),
    createdAt: row.createdAt || new Date().toISOString(),
    updatedAt: row.updatedAt || row.createdAt || new Date().toISOString(),
  };
}

async function listSheetsFromStorageFolder(folderPath, ownerUid) {
  if (!storage) return [];
  const folderRef = ref(storage, folderPath);

  try {
    const listed = await listAll(folderRef);
    const rows = await Promise.all(
      listed.items.map(async (itemRef) => {
        const [url, meta] = await Promise.all([
          getDownloadURL(itemRef),
          getMetadata(itemRef).catch(() => null),
        ]);

        const createdAt = meta?.timeCreated || new Date().toISOString();
        const updatedAt = meta?.updated || createdAt;
        const mimeType = meta?.contentType || mimeFromName(itemRef.name);
        const id = idFromFileName(itemRef.name);

        return normalizeRow({
          id,
          ownerUid,
          name: normalizeName(itemRef.name),
          description: '',
          url,
          storagePath: itemRef.fullPath,
          mimeType,
          createdAt,
          updatedAt,
        });
      }),
    );
    return sortRows(rows);
  } catch (err) {
    const code = String(err?.code || '');
    if (code === 'storage/unauthorized') {
      return [];
    }
    console.warn('[firebase] list character sheets from storage folder failed:', folderPath, err?.message || err);
    return [];
  }
}

async function listSheetsFromStorage(uid) {
  const candidates = [`users/${uid}/${SHEET_ROOT}`];
  if (ENABLE_LEGACY_STORAGE_PATH_SCAN) {
    candidates.push(`${uid}/${SHEET_ROOT}`);
  }
  const allRows = await Promise.all(candidates.map((pathText) => listSheetsFromStorageFolder(pathText, uid)));
  return dedupeRows(allRows.flat());
}

async function listSheetsAcrossStorageUsers(maxUsers = 200) {
  if (!storage) return [];
  try {
    const userRoot = ref(storage, 'users');
    const listedUsers = await listAll(userRoot);
    const folders = listedUsers.prefixes.slice(0, maxUsers);
    const allRows = await Promise.all(
      folders.map((userFolderRef) => {
        const ownerUid = userFolderRef.name || ownerUidFromPath(userFolderRef.fullPath);
        return listSheetsFromStorageFolder(`${userFolderRef.fullPath}/${SHEET_ROOT}`, ownerUid);
      }),
    );
    return allRows.flat();
  } catch (err) {
    console.warn('[firebase] list sheets across users failed:', err?.message || err);
    return [];
  }
}

function dedupeRows(rows) {
  const byKey = new Map();
  for (const row of rows || []) {
    const normalized = normalizeRow(row);
    const key = normalized.storagePath || `${normalized.ownerUid}:${normalized.id}`;
    if (!key) continue;
    if (!byKey.has(key)) {
      byKey.set(key, normalized);
      continue;
    }
    const prev = byKey.get(key);
    if (parseTime(normalized.updatedAt) > parseTime(prev.updatedAt)) {
      byKey.set(key, normalized);
    }
  }
  return sortRows(Array.from(byKey.values()));
}

async function backfillSheetDocs(uid, rows) {
  if (!Array.isArray(rows) || rows.length === 0) return;
  await Promise.all(
    rows.map(async (row) => {
      try {
        await setDoc(doc(db, 'users', uid, SHEET_COLLECTION, row.id), row, { merge: true });
      } catch (err) {
        console.warn('[firebase] backfill character sheet doc failed:', err?.message || err);
      }
    }),
  );
}

export async function listCharacterSheets() {
  if (!isFirebaseConfigured || !db) {
    throw new Error('Firebase is not configured');
  }
  const uid = await ensureUid();
  if (!uid) {
    throw new Error('Google 로그인 후 다시 시도해 주세요.');
  }

  try {
    const q = query(sheetCollectionRef(uid));
    const snap = await getDocs(q);
    const rows = sortRows(snap.docs.map((d) => normalizeRow({
      id: d.id,
      ownerUid: uid,
      ...d.data(),
    })));
    if (rows.length > 0) return rows;

    if (!ENABLE_STORAGE_LIST_RECOVERY) {
      return [];
    }

    // Firestore 문서가 비어도 Storage 원본이 있으면 자동 복구한다.
    const recovered = await listSheetsFromStorage(uid);
    if (recovered.length > 0) {
      await backfillSheetDocs(uid, recovered);
    }
    return recovered;
  } catch (err) {
    console.warn('[firebase] list character sheets failed:', err?.message || err);
    throw err;
  }
}

export async function browseCharacterSheets({ max = 300, includeShared = false } = {}) {
  if (!isFirebaseConfigured || !db) {
    throw new Error('Firebase is not configured');
  }

  const uid = await ensureUid();
  if (!uid) {
    throw new Error('Google 로그인 후 다시 시도해 주세요.');
  }

  let mineRows = [];
  try {
    const mineQ = query(sheetCollectionRef(uid), limit(Math.max(1, Math.min(max, 500))));
    const mineSnap = await getDocs(mineQ);
    mineRows = mineSnap.docs.map((d) => normalizeRow({
      id: d.id,
      ownerUid: uid,
      ...d.data(),
    }));
  } catch (err) {
    console.warn('[firebase] browse character sheets (mine docs) failed:', err?.message || err);
  }

  if (mineRows.length === 0) {
    if (!ENABLE_STORAGE_LIST_RECOVERY) {
      return dedupeRows(mineRows);
    }
    mineRows = await listSheetsFromStorage(uid);
    if (mineRows.length > 0) {
      await backfillSheetDocs(uid, mineRows);
    }
  }

  if (!includeShared) {
    return dedupeRows(mineRows);
  }

  const rows = [...mineRows];
  try {
    const groupQ = query(collectionGroup(db, SHEET_COLLECTION), limit(Math.max(1, Math.min(max, 500))));
    const groupSnap = await getDocs(groupQ);
    rows.push(...groupSnap.docs.map((d) => normalizeRow({
      id: d.id,
      ownerUid: ownerUidFromPath(d.ref.path),
      ...d.data(),
    })));
  } catch (err) {
    console.warn('[firebase] browse character sheets via collectionGroup failed:', err?.message || err);
  }

  const storageRows = await listSheetsAcrossStorageUsers();
  if (storageRows.length > 0) {
    rows.push(...storageRows);
  }

  return dedupeRows(rows);
}

export async function uploadCharacterSheet(file) {
  if (!file) throw new Error('No file selected');
  if (!isFirebaseConfigured || !db || !storage) {
    throw new Error('Firebase is not configured');
  }

  const uid = await ensureUid();
  if (!uid) {
    throw new Error('Google 로그인 후 다시 시도해 주세요.');
  }

  const id = generateId();
  const ext = safeExtFromFile(file);
  const storagePath = `users/${uid}/${SHEET_ROOT}/${id}.${ext}`;
  const storageRef = ref(storage, storagePath);

  await uploadBytes(storageRef, file, {
    contentType: file.type || 'image/png',
    cacheControl: 'public,max-age=31536000',
  });

  const url = await getDownloadURL(storageRef);
  const now = new Date().toISOString();
  const payload = {
    id,
    name: normalizeName(file.name),
    description: '',
    ownerUid: uid,
    url,
    storagePath,
    mimeType: file.type || 'image/png',
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(doc(db, 'users', uid, SHEET_COLLECTION, id), payload);
  return payload;
}

export async function updateCharacterSheet(sheetId, updates = {}) {
  if (typeof sheetId !== 'string' || !sheetId.trim()) {
    throw new Error('Invalid sheet id');
  }
  if (!isFirebaseConfigured || !db) {
    throw new Error('Firebase is not configured');
  }

  const uid = await ensureUid();
  if (!uid) {
    throw new Error('Google 로그인 후 다시 시도해 주세요.');
  }

  const patch = {};
  if (Object.prototype.hasOwnProperty.call(updates, 'name')) {
    patch.name = normalizeName(updates.name);
  }
  if (Object.prototype.hasOwnProperty.call(updates, 'description')) {
    patch.description = normalizeDescription(updates.description);
  }
  patch.updatedAt = new Date().toISOString();

  await setDoc(doc(db, 'users', uid, SHEET_COLLECTION, sheetId), patch, { merge: true });
  return patch;
}

export async function deleteCharacterSheet(sheet) {
  if (!sheet || typeof sheet.id !== 'string') return;
  if (!isFirebaseConfigured || !db) return;

  const uid = await ensureUid();
  if (!uid) return;

  try {
    await deleteDoc(doc(db, 'users', uid, SHEET_COLLECTION, sheet.id));
  } catch (err) {
    console.warn('[firebase] delete character sheet doc failed:', err?.message || err);
  }

  if (sheet.storagePath && storage) {
    try {
      await deleteObject(ref(storage, sheet.storagePath));
    } catch (err) {
      console.warn('[firebase] delete character sheet file failed:', err?.message || err);
    }
  }
}
