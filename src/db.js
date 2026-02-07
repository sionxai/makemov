import { openDB } from 'idb';

const DB_NAME = 'makemov';
const DB_VERSION = 1;
const STORE_NAME = 'projects';

async function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('updatedAt', 'updatedAt');
        store.createIndex('status', 'status');
      }
    },
  });
}

function generateId() {
  return 'proj_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
}

function createEmptyProject(title, description = '') {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    title,
    description,
    status: 'draft', // draft | progress | complete
    createdAt: now,
    updatedAt: now,
    synopsis: { content: '', updatedAt: null },
    screenplay: { scenes: [], updatedAt: null },
    conti: { scenes: [], assumptions: [], updatedAt: null },
    storyboard: { frames: [], updatedAt: null },
    keyvisuals: [],
    productionPrompts: [],
    shareEnabled: false,
    shareId: null,
  };
}

// --- CRUD ---

export async function getAllProjects() {
  const db = await getDB();
  const all = await db.getAll(STORE_NAME);
  return all.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

export async function getProject(id) {
  const db = await getDB();
  return db.get(STORE_NAME, id);
}

export async function createProject(title, description) {
  const db = await getDB();
  const project = createEmptyProject(title, description);
  await db.put(STORE_NAME, project);
  return project;
}

export async function updateProject(id, updates) {
  const db = await getDB();
  const existing = await db.get(STORE_NAME, id);
  if (!existing) throw new Error('Project not found: ' + id);
  const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
  await db.put(STORE_NAME, updated);
  return updated;
}

export async function deleteProject(id) {
  const db = await getDB();
  await db.delete(STORE_NAME, id);
}

// --- Section updaters ---

export async function updateSynopsis(id, content) {
  return updateProject(id, {
    synopsis: { content, updatedAt: new Date().toISOString() },
  });
}

export async function updateScreenplay(id, scenes) {
  return updateProject(id, {
    screenplay: { scenes, updatedAt: new Date().toISOString() },
  });
}

export async function updateConti(id, contiData) {
  return updateProject(id, {
    conti: { ...contiData, updatedAt: new Date().toISOString() },
  });
}

export async function updateStoryboard(id, frames) {
  return updateProject(id, {
    storyboard: { frames, updatedAt: new Date().toISOString() },
  });
}

export async function addKeyVisual(id, visual) {
  const project = await getProject(id);
  const keyvisuals = [...project.keyvisuals, { ...visual, id: generateId(), createdAt: new Date().toISOString() }];
  return updateProject(id, { keyvisuals });
}

export async function removeKeyVisual(projectId, visualId) {
  const project = await getProject(projectId);
  const keyvisuals = project.keyvisuals.filter(v => v.id !== visualId);
  return updateProject(projectId, { keyvisuals });
}

export async function addProductionPrompt(id, prompt) {
  const project = await getProject(id);
  const productionPrompts = [...project.productionPrompts, { ...prompt, id: generateId(), createdAt: new Date().toISOString() }];
  return updateProject(id, { productionPrompts });
}

export async function removeProductionPrompt(projectId, promptId) {
  const project = await getProject(projectId);
  const productionPrompts = project.productionPrompts.filter(p => p.id !== promptId);
  return updateProject(projectId, { productionPrompts });
}

// --- Export/Import ---

export async function exportProject(id) {
  const project = await getProject(id);
  return JSON.stringify(project, null, 2);
}

export async function importProject(jsonString) {
  const db = await getDB();
  const project = JSON.parse(jsonString);
  project.id = generateId(); // New ID to avoid conflicts
  project.updatedAt = new Date().toISOString();
  await db.put(STORE_NAME, project);
  return project;
}

// --- Seed Data ---

import { JINJU_SYNOPSIS, JINJU_PROJECT, JINJU_SCREENPLAY, JINJU_STORYBOARD, JINJU_KEYVISUALS, JINJU_PROMPTS } from './data/jinju-seed';
import { JINJU_CONTI } from './data/jinju-conti';

export async function seedJinjuProject() {
  const db = await getDB();
  const existing = await db.getAll(STORE_NAME);
  const found = existing.find(p => p.title === '진주성의 최후 9일');

  const now = new Date().toISOString();

  // 이미 존재하면 → 빠진 데이터 마이그레이션
  if (found) {
    let changed = false;
    if (!found.synopsis?.structured) {
      found.synopsis = { structured: JINJU_SYNOPSIS, updatedAt: now };
      changed = true;
    }
    if (!found.screenplay?.scenes?.length) {
      found.screenplay = { scenes: JINJU_SCREENPLAY, updatedAt: now };
      changed = true;
    }
    const contiNeedsUpdate = !found.conti?.scenes?.length ||
      !found.conti?.scenes?.[0]?.cuts?.[0]?.sketch_prompt?.includes('Photorealistic');
    if (contiNeedsUpdate) {
      found.conti = { ...JINJU_CONTI, updatedAt: now };
      changed = true;
    }
    if (!found.storyboard?.frames?.length) {
      found.storyboard = { frames: JINJU_STORYBOARD, updatedAt: now };
      changed = true;
    } else {
      // 기존 프레임의 빈 imageUrl을 시드에서 동기화
      found.storyboard.frames.forEach((f, i) => {
        if (!f.imageUrl && JINJU_STORYBOARD[i]?.imageUrl) {
          f.imageUrl = JINJU_STORYBOARD[i].imageUrl;
          changed = true;
        }
      });
    }
    if (!found.keyvisuals?.length) {
      found.keyvisuals = JINJU_KEYVISUALS;
      changed = true;
    } else {
      // 기존 키비주얼의 빈 imageUrl을 시드에서 동기화
      found.keyvisuals.forEach(kv => {
        const seedKv = JINJU_KEYVISUALS.find(s => s.id === kv.id);
        if (!kv.imageUrl && seedKv?.imageUrl) {
          kv.imageUrl = seedKv.imageUrl;
          changed = true;
        }
      });
    }
    if (!found.productionPrompts?.length) {
      found.productionPrompts = JINJU_PROMPTS;
      changed = true;
    }
    if (changed) {
      found.updatedAt = now;
      await db.put(STORE_NAME, found);
      return found;
    }
    return null;
  }

  // 없으면 → 새로 생성 (모든 데이터 포함)
  const project = {
    ...createEmptyProject(JINJU_PROJECT.title, JINJU_PROJECT.description),
    id: JINJU_PROJECT.id,
    status: JINJU_PROJECT.status,
    createdAt: now,
    updatedAt: now,
    synopsis: { structured: JINJU_SYNOPSIS, updatedAt: now },
    screenplay: { scenes: JINJU_SCREENPLAY, updatedAt: now },
    conti: { ...JINJU_CONTI, updatedAt: now },
    storyboard: { frames: JINJU_STORYBOARD, updatedAt: now },
    keyvisuals: JINJU_KEYVISUALS,
    productionPrompts: JINJU_PROMPTS,
  };
  await db.put(STORE_NAME, project);
  return project;
}
