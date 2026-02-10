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

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function readFirstNumber(text) {
  if (typeof text !== 'string') return null;
  const match = text.match(/(\d+(\.\d+)?)/);
  if (!match) return null;
  return Number(match[1]);
}

function getSynopsisLengthRules(runtimeText) {
  const fallback = {
    minActContent: 120,
    minTotalActContent: 700,
  };
  if (typeof runtimeText !== 'string') return fallback;

  if (runtimeText.includes('초')) {
    const seconds = readFirstNumber(runtimeText);
    if (seconds !== null) {
      if (seconds <= 120) {
        return { minActContent: 60, minTotalActContent: 300 };
      }
      return { minActContent: 90, minTotalActContent: 500 };
    }
  }

  if (runtimeText.includes('분')) {
    const minutes = readFirstNumber(runtimeText);
    if (minutes !== null) {
      if (minutes <= 2) {
        return { minActContent: 70, minTotalActContent: 350 };
      }
      if (minutes <= 5) {
        return { minActContent: 130, minTotalActContent: 750 };
      }
      if (minutes <= 10) {
        return { minActContent: 220, minTotalActContent: 1200 };
      }
      return { minActContent: 260, minTotalActContent: 1500 };
    }
  }

  return fallback;
}

function validateRequiredString(value, label, errors, minLength = 1) {
  if (typeof value !== 'string') {
    errors.push(`${label} must be a string`);
    return;
  }
  const len = value.trim().length;
  if (len < minLength) {
    errors.push(`${label} must be at least ${minLength} chars`);
  }
}

function validateSynopsisStructured(data) {
  const errors = [];
  if (!isPlainObject(data)) {
    throw new Error('[SynopsisValidation] structured synopsis must be an object');
  }

  validateRequiredString(data.title, 'title', errors, 2);
  validateRequiredString(data.titleEn, 'titleEn', errors, 2);
  validateRequiredString(data.logline, 'logline', errors, 40);
  validateRequiredString(data.theme, 'theme', errors, 20);

  if (!isPlainObject(data.info)) {
    errors.push('info must be an object');
  } else {
    validateRequiredString(data.info.genre, 'info.genre', errors, 2);
    validateRequiredString(data.info.runtime, 'info.runtime', errors, 1);
    validateRequiredString(data.info.tone, 'info.tone', errors, 2);
    validateRequiredString(data.info.audience, 'info.audience', errors, 2);
    validateRequiredString(data.info.format, 'info.format', errors, 2);
  }

  const lengthRules = getSynopsisLengthRules(data.info?.runtime);
  if (!Array.isArray(data.acts) || data.acts.length < 4) {
    errors.push('acts must be an array with at least 4 items');
  } else {
    let totalActLength = 0;
    data.acts.forEach((act, idx) => {
      if (!isPlainObject(act)) {
        errors.push(`acts[${idx}] must be an object`);
        return;
      }
      validateRequiredString(act.title, `acts[${idx}].title`, errors, 1);
      validateRequiredString(act.subtitle, `acts[${idx}].subtitle`, errors, 1);
      validateRequiredString(act.content, `acts[${idx}].content`, errors, lengthRules.minActContent);
      if (typeof act.content === 'string') {
        totalActLength += act.content.trim().length;
      }
    });
    if (totalActLength < lengthRules.minTotalActContent) {
      errors.push(`acts total content must be at least ${lengthRules.minTotalActContent} chars for runtime "${data.info?.runtime || 'unknown'}"`);
    }
  }

  const characterFields = ['name', 'nameHanja', 'role', 'age', 'appearance', 'personality', 'motivation', 'arc'];
  if (!Array.isArray(data.characters) || data.characters.length < 3) {
    errors.push('characters must be an array with at least 3 items');
  } else {
    data.characters.forEach((ch, idx) => {
      if (!isPlainObject(ch)) {
        errors.push(`characters[${idx}] must be an object`);
        return;
      }
      characterFields.forEach((field) => {
        if (!(field in ch)) {
          errors.push(`characters[${idx}].${field} is required`);
        }
      });
      validateRequiredString(ch.name, `characters[${idx}].name`, errors, 1);
      validateRequiredString(ch.role, `characters[${idx}].role`, errors, 1);
      validateRequiredString(ch.appearance, `characters[${idx}].appearance`, errors, 6);
      validateRequiredString(ch.personality, `characters[${idx}].personality`, errors, 4);
      validateRequiredString(ch.motivation, `characters[${idx}].motivation`, errors, 4);
      validateRequiredString(ch.arc, `characters[${idx}].arc`, errors, 4);
      if (typeof ch.nameHanja !== 'string') {
        errors.push(`characters[${idx}].nameHanja must be a string (empty string allowed)`);
      }
      if (typeof ch.age !== 'string') {
        errors.push(`characters[${idx}].age must be a string (empty string allowed)`);
      }
    });
  }

  if (!isPlainObject(data.visualTone)) {
    errors.push('visualTone must be an object');
  } else {
    validateRequiredString(data.visualTone.palette, 'visualTone.palette', errors, 4);
    validateRequiredString(data.visualTone.lighting, 'visualTone.lighting', errors, 4);
    validateRequiredString(data.visualTone.camera, 'visualTone.camera', errors, 4);
    validateRequiredString(data.visualTone.references, 'visualTone.references', errors, 2);
  }

  if (!isPlainObject(data.sound)) {
    errors.push('sound must be an object');
  } else {
    validateRequiredString(data.sound.bgm, 'sound.bgm', errors, 4);
    validateRequiredString(data.sound.sfx, 'sound.sfx', errors, 4);
    validateRequiredString(data.sound.narration, 'sound.narration', errors, 2);
  }

  if (!Array.isArray(data.keyScenes) || data.keyScenes.length < 5) {
    errors.push('keyScenes must be an array with at least 5 items');
  } else {
    data.keyScenes.forEach((scene, idx) => {
      if (!isPlainObject(scene)) {
        errors.push(`keyScenes[${idx}] must be an object`);
        return;
      }
      validateRequiredString(scene.title, `keyScenes[${idx}].title`, errors, 2);
      validateRequiredString(scene.description, `keyScenes[${idx}].description`, errors, 8);
    });
  }

  if (errors.length > 0) {
    throw new Error(`[SynopsisValidation] ${errors.join(' | ')}`);
  }
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

// --- Screenplay density rules (screenplay/SKILL.md v2.0 준용) ---

function getScreenplayDensityRules(runtimeText) {
  const fallback = { minScenes: 5, minActionPerScene: 50, minTotalPerScene: 80, minTotalContent: 500 };
  if (typeof runtimeText !== 'string') return fallback;

  const runtimeSec = parseRuntimeToSeconds(runtimeText);
  if (runtimeSec === null) return fallback;

  if (runtimeSec <= 120) return { minScenes: 5, minActionPerScene: 50, minTotalPerScene: 80, minTotalContent: 500 };
  if (runtimeSec <= 300) return { minScenes: 8, minActionPerScene: 100, minTotalPerScene: 150, minTotalContent: 1200 };
  if (runtimeSec <= 600) return { minScenes: 12, minActionPerScene: 150, minTotalPerScene: 250, minTotalContent: 3000 };
  if (runtimeSec <= 900) return { minScenes: 16, minActionPerScene: 180, minTotalPerScene: 280, minTotalContent: 4500 };
  return { minScenes: 20, minActionPerScene: 200, minTotalPerScene: 300, minTotalContent: 6000 };
}

function parseRuntimeToSeconds(text) {
  if (typeof text !== 'string') return null;
  if (text.includes('초')) {
    const n = readFirstNumber(text);
    return n !== null ? n : null;
  }
  if (text.includes('분')) {
    const n = readFirstNumber(text);
    return n !== null ? n * 60 : null;
  }
  return null;
}

function validateScreenplay(scenes, runtimeText) {
  const errors = [];
  if (!Array.isArray(scenes) || scenes.length === 0) {
    throw new Error('[ScreenplayValidation] scenes must be a non-empty array');
  }

  const rules = getScreenplayDensityRules(runtimeText);

  // 씬 수 체크
  if (scenes.length < rules.minScenes) {
    errors.push(`scenes count ${scenes.length} < minimum ${rules.minScenes} for runtime "${runtimeText}"`);
  }

  // 씬별 밀도 + 전체 합산
  let totalContent = 0;
  scenes.forEach((s, idx) => {
    if (!isPlainObject(s)) {
      errors.push(`scenes[${idx}] must be an object`);
      return;
    }
    const actionLen = (typeof s.action === 'string') ? s.action.trim().length : 0;
    const dialogueLen = (typeof s.dialogue === 'string') ? s.dialogue.trim().length : 0;
    const sceneTotal = actionLen + dialogueLen;
    totalContent += sceneTotal;

    if (actionLen < rules.minActionPerScene) {
      errors.push(`S${s.number || idx + 1} action ${actionLen}자 < min ${rules.minActionPerScene}자`);
    }
    if (sceneTotal < rules.minTotalPerScene) {
      errors.push(`S${s.number || idx + 1} total ${sceneTotal}자 < min ${rules.minTotalPerScene}자`);
    }
  });

  if (totalContent < rules.minTotalContent) {
    errors.push(`total content ${totalContent}자 < minimum ${rules.minTotalContent}자 for runtime "${runtimeText}"`);
  }

  if (errors.length > 0) {
    throw new Error(`[ScreenplayValidation] ${errors.join(' | ')}`);
  }
}

// --- Section updaters ---

export async function updateSynopsis(id, data) {
  // data가 객체면 structured로 저장하고, 필수 필드/분량 검증 수행
  if (typeof data === 'string') {
    const plainLength = data.trim().length;
    if (plainLength < 120) {
      throw new Error('[SynopsisValidation] plain synopsis content must be at least 120 chars');
    }
  } else {
    validateSynopsisStructured(data);
  }

  const synopsis = typeof data === 'string'
    ? { content: data, updatedAt: new Date().toISOString() }
    : { structured: data, updatedAt: new Date().toISOString() };
  return updateProject(id, { synopsis });
}

export async function updateScreenplay(id, scenes) {
  // 프로젝트의 시놉시스 런타임을 읽어 밀도 검증
  const db = await getDB();
  const project = await db.get(STORE_NAME, id);
  const runtimeText = project?.synopsis?.structured?.info?.runtime;
  if (runtimeText) {
    validateScreenplay(scenes, runtimeText);
  }
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
import { REDCLIFF_SYNOPSIS } from './data/redcliff-synopsis';
import { REDCLIFF_SCREENPLAY } from './data/redcliff-screenplay';
import { REDCLIFF_CONTI } from './data/redcliff-conti';
import {
  DONGNAE_SYNOPSIS,
  DONGNAE_PROJECT,
  DONGNAE_SCREENPLAY,
  DONGNAE_CONTI,
  DONGNAE_STORYBOARD,
  DONGNAE_KEYVISUALS,
  DONGNAE_PROMPTS,
} from './data/dongnae-seed';
import { CHILCHEON_PROJECT, CHILCHEON_SYNOPSIS, CHILCHEON_SCREENPLAY } from './data/chilcheon-seed';
import { CHILCHEON_CONTI, CHILCHEON_STORYBOARD, CHILCHEON_KEYVISUALS, CHILCHEON_PROMPTS } from './data/chilcheon-conti';
import { JINJU2_SYNOPSIS } from './data/jinju2-synopsis';
import { JINJU2_SCREENPLAY } from './data/jinju2-screenplay';
import { JINJU2_CONTI } from './data/jinju2-conti';

const JINJU_SEED_VERSION = 1;
const DONGNAE_SEED_VERSION = 1;
const CHILCHEON_SEED_VERSION = 9;

export async function seedJinjuProject() {
  const db = await getDB();
  const found = await db.get(STORE_NAME, JINJU_PROJECT.id);

  const now = new Date().toISOString();

  // 이미 존재하면 → 빠진 데이터만 채우고 seed 버전만 갱신
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
    if (!found.conti?.scenes?.length) {
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
    if (!found.seedMeta || found.seedMeta.source !== 'jinju' || found.seedMeta.version !== JINJU_SEED_VERSION) {
      found.seedMeta = { source: 'jinju', version: JINJU_SEED_VERSION };
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
    seedMeta: { source: 'jinju', version: JINJU_SEED_VERSION },
  };
  await db.put(STORE_NAME, project);
  return project;
}

// --- 동래성 Seed ---

export async function seedDongnaeProject() {
  const db = await getDB();
  const found = await db.get(STORE_NAME, DONGNAE_PROJECT.id);

  const now = new Date().toISOString();

  if (found) {
    let changed = false;
    if (!found.synopsis?.structured) {
      found.synopsis = { structured: DONGNAE_SYNOPSIS, updatedAt: now };
      changed = true;
    }
    if (!found.screenplay?.scenes?.length) {
      found.screenplay = { scenes: DONGNAE_SCREENPLAY, updatedAt: now };
      changed = true;
    }
    if (!found.conti?.scenes?.length) {
      found.conti = { ...DONGNAE_CONTI, updatedAt: now };
      changed = true;
    }
    if (!found.storyboard?.frames?.length) {
      found.storyboard = { frames: DONGNAE_STORYBOARD, updatedAt: now };
      changed = true;
    }
    if (!found.keyvisuals?.length) {
      found.keyvisuals = DONGNAE_KEYVISUALS;
      changed = true;
    }
    if (!found.productionPrompts?.length) {
      found.productionPrompts = DONGNAE_PROMPTS;
      changed = true;
    }
    if (!found.seedMeta || found.seedMeta.source !== 'dongnae' || found.seedMeta.version !== DONGNAE_SEED_VERSION) {
      found.seedMeta = { source: 'dongnae', version: DONGNAE_SEED_VERSION };
      changed = true;
    }

    if (changed) {
      found.updatedAt = now;
      await db.put(STORE_NAME, found);
      return found;
    }
    return null;
  }

  const project = {
    ...createEmptyProject(DONGNAE_PROJECT.title, DONGNAE_PROJECT.description),
    id: DONGNAE_PROJECT.id,
    status: DONGNAE_PROJECT.status,
    createdAt: now,
    updatedAt: now,
    synopsis: { structured: DONGNAE_SYNOPSIS, updatedAt: now },
    screenplay: { scenes: DONGNAE_SCREENPLAY, updatedAt: now },
    conti: { ...DONGNAE_CONTI, updatedAt: now },
    storyboard: { frames: DONGNAE_STORYBOARD, updatedAt: now },
    keyvisuals: DONGNAE_KEYVISUALS,
    productionPrompts: DONGNAE_PROMPTS,
    seedMeta: { source: 'dongnae', version: DONGNAE_SEED_VERSION },
  };
  await db.put(STORE_NAME, project);
  return project;
}

// --- 칠천량 Seed ---

export async function seedChilcheonProject() {
  const db = await getDB();
  const found = await db.get(STORE_NAME, CHILCHEON_PROJECT.id);
  const now = new Date().toISOString();

  if (found) {
    let changed = false;
    if (!found.synopsis?.structured || (found.seedMeta?.version || 0) < CHILCHEON_SEED_VERSION) {
      found.synopsis = { structured: CHILCHEON_SYNOPSIS, updatedAt: now };
      changed = true;
    }
    if (!found.screenplay?.scenes?.length || (found.seedMeta?.version || 0) < CHILCHEON_SEED_VERSION) {
      found.screenplay = { scenes: CHILCHEON_SCREENPLAY, updatedAt: now };
      changed = true;
    }
    if (!found.conti || (found.seedMeta?.version || 0) < CHILCHEON_SEED_VERSION) {
      found.conti = { ...CHILCHEON_CONTI, updatedAt: now };
      changed = true;
    }
    if (!found.storyboard?.frames?.length || (found.seedMeta?.version || 0) < CHILCHEON_SEED_VERSION) {
      found.storyboard = { frames: CHILCHEON_STORYBOARD, updatedAt: now };
      changed = true;
    }
    if (!found.keyvisuals?.length || (found.seedMeta?.version || 0) < CHILCHEON_SEED_VERSION) {
      found.keyvisuals = CHILCHEON_KEYVISUALS;
      changed = true;
    }
    if (!found.productionPrompts?.length || (found.seedMeta?.version || 0) < CHILCHEON_SEED_VERSION) {
      found.productionPrompts = CHILCHEON_PROMPTS;
      changed = true;
    }
    if (!found.seedMeta || found.seedMeta.source !== 'chilcheon' || found.seedMeta.version !== CHILCHEON_SEED_VERSION) {
      found.seedMeta = { source: 'chilcheon', version: CHILCHEON_SEED_VERSION };
      changed = true;
    }
    if (changed) {
      found.updatedAt = now;
      await db.put(STORE_NAME, found);
      return found;
    }
    return null;
  }

  const project = {
    ...createEmptyProject(CHILCHEON_PROJECT.title, CHILCHEON_PROJECT.description),
    id: CHILCHEON_PROJECT.id,
    status: CHILCHEON_PROJECT.status,
    createdAt: now,
    updatedAt: now,
    synopsis: { structured: CHILCHEON_SYNOPSIS, updatedAt: now },
    screenplay: { scenes: CHILCHEON_SCREENPLAY, updatedAt: now },
    conti: { ...CHILCHEON_CONTI, updatedAt: now },
    storyboard: { frames: CHILCHEON_STORYBOARD, updatedAt: now },
    keyvisuals: CHILCHEON_KEYVISUALS,
    productionPrompts: CHILCHEON_PROMPTS,
    seedMeta: { source: 'chilcheon', version: CHILCHEON_SEED_VERSION },
  };
  await db.put(STORE_NAME, project);
  return project;
}

// --- 적벽대전 Seed ---

const REDCLIFF_PROJECT = {
  id: 'proj_redcliff_ad',
  title: '박상률 완역 삼국지 — 적벽대전편',
  description: '20년 만에 완성된 삼국지 완역의 결정판. 적벽대전편 유튜브 숏츠 광고 90초.',
  status: 'progress',
};

export async function seedRedcliffProject() {
  const CURRENT_SYN_VER = 2; // v2: 콜드 오픈 구조
  const CURRENT_SP_VER = 5;  // v5: 주유 대사 추가
  const CURRENT_CONTI_VER = 6; // v6: 주유 대사 추가
  const db = await getDB();
  const existing = await db.getAll(STORE_NAME);
  const found = existing.find(p => p.title === REDCLIFF_PROJECT.title);

  const now = new Date().toISOString();

  if (found) {
    let changed = false;
    // 시놉시스 버전이 구버전이면 강제 갱신
    if ((found._synVer || 0) < CURRENT_SYN_VER) {
      found.synopsis = { structured: REDCLIFF_SYNOPSIS, updatedAt: now };
      found._synVer = CURRENT_SYN_VER;
      changed = true;
    }
    // 시나리오 버전이 구버전이면 강제 갱신
    if ((found._spVer || 0) < CURRENT_SP_VER) {
      found.screenplay = { scenes: REDCLIFF_SCREENPLAY, updatedAt: now };
      found._spVer = CURRENT_SP_VER;
      changed = true;
    }
    // 줄콘티 버전이 구버전이면 강제 갱신
    if (!found.conti?.scenes?.length || (found._contiVer || 0) < CURRENT_CONTI_VER) {
      found.conti = { ...REDCLIFF_CONTI, updatedAt: now };
      found._contiVer = CURRENT_CONTI_VER;
      changed = true;
    }
    if (changed) {
      found.updatedAt = now;
      await db.put(STORE_NAME, found);
      console.log('🎬 [seed] 적벽대전 데이터 갱신 완료');
      return found;
    }
    return null;
  }

  const project = {
    ...createEmptyProject(REDCLIFF_PROJECT.title, REDCLIFF_PROJECT.description),
    id: REDCLIFF_PROJECT.id,
    status: REDCLIFF_PROJECT.status,
    createdAt: now,
    updatedAt: now,
    synopsis: { structured: REDCLIFF_SYNOPSIS, updatedAt: now },
    screenplay: { scenes: REDCLIFF_SCREENPLAY, updatedAt: now },
    conti: { ...REDCLIFF_CONTI, updatedAt: now },
    _synVer: CURRENT_SYN_VER,
  };
  await db.put(STORE_NAME, project);
  return project;
}

// --- 2차 진주성전투 Seed ---

const JINJU2_PROJECT = {
  id: 'proj_jinju2_timeslip',
  title: '2차 진주성전투 — 시간원정대 타임슬립',
  description: '1593년 2차 진주성 전투, 시간원정대가 제주목사 이경록의 300 기병과 함께 진주성을 구해내는 타임슬립 액션. 약 180초.',
  status: 'progress',
};

export async function seedJinju2Project() {
  const CURRENT_SYN_VER = 1;
  const CURRENT_SP_VER = 1;
  const CURRENT_CONTI_VER = 2; // v2: 인서트 보강 — 40컷→55컷
  const db = await getDB();
  const existing = await db.getAll(STORE_NAME);
  const found = existing.find(p => p.title === JINJU2_PROJECT.title);

  const now = new Date().toISOString();

  if (found) {
    let changed = false;
    if ((found._synVer || 0) < CURRENT_SYN_VER) {
      found.synopsis = { structured: JINJU2_SYNOPSIS, updatedAt: now };
      found._synVer = CURRENT_SYN_VER;
      changed = true;
    }
    if ((found._spVer || 0) < CURRENT_SP_VER) {
      found.screenplay = { scenes: JINJU2_SCREENPLAY, updatedAt: now };
      found._spVer = CURRENT_SP_VER;
      changed = true;
    }
    if (!found.conti?.scenes?.length || (found._contiVer || 0) < CURRENT_CONTI_VER) {
      found.conti = { ...JINJU2_CONTI, updatedAt: now };
      found._contiVer = CURRENT_CONTI_VER;
      changed = true;
    }
    if (changed) {
      found.updatedAt = now;
      await db.put(STORE_NAME, found);
      console.log('🏯 [seed] 2차 진주성전투 데이터 갱신 완료');
      return found;
    }
    return null;
  }

  const project = {
    ...createEmptyProject(JINJU2_PROJECT.title, JINJU2_PROJECT.description),
    id: JINJU2_PROJECT.id,
    status: JINJU2_PROJECT.status,
    createdAt: now,
    updatedAt: now,
    synopsis: { structured: JINJU2_SYNOPSIS, updatedAt: now },
    screenplay: { scenes: JINJU2_SCREENPLAY, updatedAt: now },
    conti: { ...JINJU2_CONTI, updatedAt: now },
    _synVer: CURRENT_SYN_VER,
    _spVer: CURRENT_SP_VER,
    _contiVer: CURRENT_CONTI_VER,
  };
  await db.put(STORE_NAME, project);
  console.log('🏯 [seed] 2차 진주성전투 신규 생성 완료');
  return project;
}
