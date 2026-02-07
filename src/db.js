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

import { JINJU_SYNOPSIS, JINJU_PROJECT } from './data/jinju-seed';

export async function seedJinjuProject() {
  const db = await getDB();
  const existing = await db.getAll(STORE_NAME);
  if (existing.some(p => p.title === '진주성의 최후 9일')) return null;

  const now = new Date().toISOString();
  const project = {
    ...createEmptyProject(JINJU_PROJECT.title, JINJU_PROJECT.description),
    id: JINJU_PROJECT.id,
    status: JINJU_PROJECT.status,
    createdAt: now,
    updatedAt: now,
    synopsis: { structured: JINJU_SYNOPSIS, updatedAt: now },
  };
  await db.put(STORE_NAME, project);
  return project;
}
