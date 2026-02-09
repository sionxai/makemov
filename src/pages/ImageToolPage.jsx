import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  browseCharacterSheets,
  deleteCharacterSheet,
  listCharacterSheets,
  updateCharacterSheet,
  uploadCharacterSheet,
} from '../firebase/characterSheetStore';
import { ACTION_STEPS, ASPECT_RATIOS, CINEMATIC_ANGLES } from '../imageTool/constants';
import {
  applyToneAndManner,
  fileToBase64,
  generateImageWithMultipleReferences,
  generateImageWithReference,
} from '../imageTool/geminiService';
import {
  clearImageToolSnapshot,
  IMAGE_TOOL_RETENTION_DAYS,
  loadImageToolSnapshot,
  saveImageToolSnapshot,
} from '../imageTool/historyStore';
import {
  auth,
  consumeGoogleRedirectResult,
  onFirebaseAuthChanged,
  signInWithGoogle,
  signOutFirebaseAuth,
} from '../firebase/client';

const TOOL_TABS = [
  { id: 'multi', label: '다양한 화각 생성', icon: '🎥' },
  { id: 'sheet', label: '양식 포맷 동일 생성', icon: '👤' },
  { id: 'action', label: '액션 시퀀스 생성', icon: '🔥' },
  { id: 'tone', label: '톤앤매너 다중 수정', icon: '🎨' },
];

const GEMINI_KEY_STORAGE = 'makemov_gemini_api_key';
const CHARACTER_SHEET_SELECTION_STORAGE = 'makemov_character_sheet_selection';
const inlineImageCache = new Map();

function buildMultiAnglePrompt({ angleName, angleDescription, additionalPrompt, ratio }) {
  const requirementText = String(additionalPrompt || '').trim() || 'No extra style requirement';
  return `Based on this key image, generate a new image with the following cinematic angle: ${angleName}. ${angleDescription}. Requirements: ${requirementText}. Maintain strict character/environmental consistency. Generate exactly one coherent frame (not a collage or split-screen). Keep a single scene and preserve subject identity. Ratio: ${ratio}.`;
}

function buildActionStepPrompt({ stepIndex, stepLabel, additionalPrompt, ratio }) {
  const styleText = String(additionalPrompt || '').trim() || 'No extra style requirement';
  return `Based on this key frame, generate action step ${stepIndex + 1}: ${stepLabel}. Keep the same character identity, costume, and environment continuity. Single coherent cinematic frame only (no collage, no split-screen, no montage). Preserve directional continuity and progression from previous step. Add dynamic motion cues naturally (motion blur, impact, debris) without changing core subject count. Style info: ${styleText}. Output ratio: ${ratio}.`;
}

function clampWorkerCount(value) {
  if (value <= 3) return 3;
  if (value >= 5) return 5;
  return 4;
}

function WorkerCountControl({ value, onChange, disabled }) {
  return (
    <div className="form-group">
      <label className="form-label">동시 워커 수</label>
      <div style={{ display: 'flex', gap: '6px' }}>
        {[3, 4, 5].map((count) => (
          <button
            key={count}
            type="button"
            disabled={disabled}
            className={`btn btn-sm ${value === count ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => onChange(count)}
          >
            {count}
          </button>
        ))}
      </div>
    </div>
  );
}

async function runConcurrentTasks({ items, workerCount, shouldStop, runTask, onDone, onTaskError }) {
  const total = items.length;
  let cursor = 0;
  let done = 0;
  const concurrency = Math.min(clampWorkerCount(workerCount), total || 1);

  async function worker() {
    while (!shouldStop()) {
      const index = cursor;
      cursor += 1;
      if (index >= total) break;
      const item = items[index];
      try {
        await runTask(item, index);
      } catch (taskErr) {
        if (onTaskError) onTaskError(taskErr, item, index);
      }
      done += 1;
      onDone(done, total);
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return { done, total, stopped: shouldStop() };
}

function parseDataUrl(source) {
  const match = String(source || '').match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) {
    throw new Error('지원되지 않는 이미지 데이터 형식입니다.');
  }
  return {
    mimeType: match[1] || 'image/png',
    data: match[2] || '',
  };
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = (error) => reject(error);
  });
}

async function sourceToInlineImage(source, fallbackMimeType = 'image/png') {
  if (typeof source !== 'string' || !source.trim()) {
    throw new Error('이미지 소스가 비어 있습니다.');
  }
  const key = source.trim();
  if (inlineImageCache.has(key)) {
    return inlineImageCache.get(key);
  }

  let inline;
  if (key.startsWith('data:image/')) {
    inline = parseDataUrl(key);
  } else {
    const response = await fetch(key);
    if (!response.ok) {
      throw new Error(`이미지 로드 실패 (${response.status})`);
    }
    const blob = await response.blob();
    const dataUrl = await blobToDataUrl(blob);
    inline = parseDataUrl(dataUrl);
  }

  const normalized = {
    data: inline.data,
    mimeType: inline.mimeType || fallbackMimeType,
  };
  inlineImageCache.set(key, normalized);
  return normalized;
}

async function resolvePrimaryInputImage({ file, externalImage, fallbackMimeType = 'image/png' }) {
  if (file) {
    return {
      data: await fileToBase64(file),
      mimeType: file.type || fallbackMimeType,
    };
  }
  if (externalImage?.url) {
    return sourceToInlineImage(externalImage.url, externalImage.mimeType || fallbackMimeType);
  }
  throw new Error('키 이미지를 먼저 선택해 주세요.');
}

async function buildCharacterSheetInlineReferences(characterSheets) {
  if (!Array.isArray(characterSheets) || characterSheets.length === 0) return [];
  const refs = await Promise.all(
    characterSheets.map(async (sheet) => {
      const inline = await sourceToInlineImage(sheet.url, sheet.mimeType || 'image/png');
      return {
        data: inline.data,
        mimeType: inline.mimeType || sheet.mimeType || 'image/png',
      };
    }),
  );
  return refs;
}

function buildCharacterSlotGuide(characterSheets) {
  if (!Array.isArray(characterSheets) || characterSheets.length === 0) return '';
  const lines = characterSheets.map((sheet) => {
    const label = String(sheet.description || '').trim() || String(sheet.name || '').trim() || 'unlabeled character';
    return `- SLOT ${sheet.slot}: ${label}`;
  });
  return [
    'Character slot map (reference order is strict):',
    ...lines,
    'Rules: keep each SLOT identity distinct, do not merge SLOTs, and preserve each SLOT face/hair/outfit/accessory consistency.',
  ].join('\n');
}

function withCharacterSheetDirective(prompt, characterSheets) {
  const guide = buildCharacterSlotGuide(characterSheets);
  if (!guide) return prompt;
  return `${prompt}\n\n${guide}`;
}

function readSelectedCharacterSheetIds() {
  try {
    const raw = localStorage.getItem(CHARACTER_SHEET_SELECTION_STORAGE);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id) => typeof id === 'string' && id.trim());
  } catch {
    return [];
  }
}

function stableHash(input) {
  const text = String(input || '');
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(36);
}

function importedSheetIdFromRow(row) {
  const key = `${row.ownerUid || 'unknown'}|${row.id || ''}|${row.storagePath || row.url || ''}`;
  return `imported_${stableHash(key)}`;
}

function downloadImage(url, filename) {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function createResultItem(base) {
  const nowIso = new Date().toISOString();
  return {
    ...base,
    createdAt: base?.createdAt || nowIso,
    updatedAt: nowIso,
    pinned: Boolean(base?.pinned),
  };
}

function togglePinned(results, targetId) {
  return results.map((item) => {
    if (item.id !== targetId) return item;
    return {
      ...item,
      pinned: !item.pinned,
      updatedAt: new Date().toISOString(),
    };
  });
}

function RatioButtons({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
      {ASPECT_RATIOS.map((ratio) => (
        <button
          key={ratio}
          className={`btn btn-sm ${value === ratio ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => onChange(ratio)}
          type="button"
        >
          {ratio}
        </button>
      ))}
    </div>
  );
}

function CharacterSheetReferencePanel({
  sheets,
  selectedIds,
  selectedCount,
  signedIn,
  loading,
  uploading,
  savingSheetId,
  info,
  error,
  onRefresh,
  onOpenPicker,
  onUpload,
  onToggle,
  onDescriptionChange,
  onDescriptionBlur,
  onDelete,
}) {
  return (
    <div className="card" style={{ marginBottom: 'var(--space-md)', padding: 'var(--space-md)' }}>
      <div className="flex-between" style={{ marginBottom: 'var(--space-sm)', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>내 캐릭터 시트 (공통 참조)</h3>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <label className="btn btn-secondary btn-sm" style={{ margin: 0 }}>
            {uploading ? '업로드 중...' : '시트 업로드'}
            <input
              type="file"
              accept="image/*"
              multiple
              disabled={uploading || !signedIn}
              style={{ display: 'none' }}
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                e.target.value = '';
                if (files.length > 0) {
                  void onUpload(files);
                }
              }}
            />
          </label>
          <button className="btn btn-ghost btn-sm" type="button" onClick={onRefresh} disabled={loading || uploading || !signedIn}>
            {loading ? '불러오는 중...' : '불러오기'}
          </button>
          <button className="btn btn-ghost btn-sm" type="button" onClick={onOpenPicker} disabled={loading || uploading || !signedIn}>
            Firebase 목록
          </button>
        </div>
      </div>
      {!signedIn && (
        <div className="text-muted" style={{ fontSize: '0.78rem', marginBottom: '8px' }}>
          Google 로그인 후 캐릭터 시트 불러오기/업로드가 가능합니다.
        </div>
      )}
      <div className="text-muted" style={{ fontSize: '0.78rem', marginBottom: '8px' }}>
        체크한 시트는 `SLOT 번호`로 프롬프트에 자동 주입됩니다. 설명을 적으면 모델이 슬롯 역할을 더 정확히 구분합니다. 선택됨: {selectedCount}개
      </div>
      <div className="text-muted" style={{ fontSize: '0.75rem', marginBottom: '8px' }}>
        업로드한 캐릭터 시트는 Firebase에 저장되며, 삭제하지 않는 한 계속 불러옵니다.
      </div>
      {!!info && !error && (
        <div className="text-muted" style={{ fontSize: '0.77rem', marginBottom: '8px' }}>
          {info}
        </div>
      )}
      {!!error && (
        <div style={{ color: 'var(--accent-danger)', fontSize: '0.8rem', marginBottom: '8px' }}>
          {error}
        </div>
      )}
      {sheets.length === 0 ? (
        <div style={{ display: 'grid', gap: '8px' }}>
          <div className="text-muted" style={{ fontSize: '0.82rem' }}>
            저장된 캐릭터 시트가 없습니다. 이미 업로드한 시트가 있다면 아래 버튼으로 Firebase에서 다시 불러오세요.
          </div>
          <div>
            <button className="btn btn-secondary btn-sm" type="button" onClick={onRefresh} disabled={loading || uploading || !signedIn}>
              {loading ? '불러오는 중...' : 'Firebase에서 불러오기'}
            </button>
            <button className="btn btn-ghost btn-sm" type="button" onClick={onOpenPicker} disabled={loading || uploading || !signedIn} style={{ marginLeft: '8px' }}>
              목록에서 선택
            </button>
          </div>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gap: '10px',
            gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
          }}
        >
          {sheets.map((sheet) => {
            const checked = selectedIds.includes(sheet.id);
            const slotNumber = checked ? selectedIds.indexOf(sheet.id) + 1 : null;
            const description = typeof sheet.description === 'string' ? sheet.description : '';
            return (
              <div
                key={sheet.id}
                className="card"
                style={{
                  padding: '8px',
                  borderColor: checked ? 'var(--accent-primary)' : 'var(--border-subtle)',
                }}
              >
                <label style={{ display: 'grid', gap: '6px', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onToggle(sheet.id)}
                    />
                    {slotNumber ? (
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          color: 'var(--accent-primary)',
                          border: '1px solid var(--accent-primary)',
                          borderRadius: '999px',
                          padding: '1px 7px',
                        }}
                      >
                        SLOT {slotNumber}
                      </span>
                    ) : null}
                    <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                      {sheet.name || 'character-sheet'}
                    </span>
                  </div>
                  <img
                    src={sheet.url}
                    alt={sheet.name || 'character-sheet'}
                    style={{
                      width: '100%',
                      aspectRatio: '1 / 1',
                      objectFit: 'cover',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-tertiary)',
                    }}
                  />
                </label>
                <div style={{ marginTop: '6px' }}>
                  <div className="text-muted" style={{ fontSize: '0.7rem', marginBottom: '4px' }}>
                    슬롯 설명 (프롬프트 주입)
                  </div>
                  <input
                    className="form-input"
                    type="text"
                    value={description}
                    onChange={(e) => onDescriptionChange(sheet.id, e.target.value)}
                    onBlur={(e) => void onDescriptionBlur(sheet.id, e.target.value)}
                    placeholder="예: 이순신 장군, 청색 갑옷, 장검, 중년 남성"
                    style={{ fontSize: '0.74rem', padding: '8px 9px' }}
                  />
                </div>
                <div style={{ marginTop: '6px', display: 'flex', justifyContent: 'flex-end' }}>
                  {savingSheetId === sheet.id ? (
                    <span className="text-muted" style={{ fontSize: '0.72rem', marginRight: '6px' }}>
                      저장 중...
                    </span>
                  ) : null}
                  <button className="btn btn-ghost btn-sm" type="button" onClick={() => void onDelete(sheet)}>
                    삭제
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CharacterSheetPickerModal({
  open,
  loading,
  error,
  rows,
  selectedIds,
  onToggle,
  onRefresh,
  onImport,
  onClose,
}) {
  if (!open) return null;
  const selectedCount = selectedIds.length;
  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 17, 23, 0.54)',
        zIndex: 1200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{ width: 'min(980px, 96vw)', maxHeight: '84vh', padding: '12px', display: 'grid', gap: '10px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-between" style={{ alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>Firebase 캐릭터 시트 목록</h3>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-ghost btn-sm" type="button" onClick={onRefresh} disabled={loading}>
              {loading ? '조회 중...' : '다시 조회'}
            </button>
            <button className="btn btn-secondary btn-sm" type="button" onClick={onClose}>
              닫기
            </button>
          </div>
        </div>
        <div className="text-muted" style={{ fontSize: '0.78rem' }}>
          목록을 확인한 뒤 필요한 시트만 선택해서 가져오세요. 선택 {selectedCount}개
        </div>
        {!!error && (
          <div style={{ color: 'var(--accent-danger)', fontSize: '0.8rem' }}>{error}</div>
        )}
        <div style={{ overflow: 'auto', maxHeight: '56vh', paddingRight: '2px' }}>
          {rows.length === 0 && !loading ? (
            <div className="text-muted" style={{ fontSize: '0.82rem' }}>
              Firebase에서 찾은 시트가 없습니다.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '8px' }}>
              {rows.map((row) => {
                const checked = selectedIds.includes(row.key);
                return (
                  <label key={row.key} className="card" style={{ padding: '7px', cursor: 'pointer', display: 'grid', gap: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => onToggle(row.key)}
                      />
                      <span style={{ fontSize: '0.76rem', fontWeight: 600 }}>{row.name || 'character-sheet'}</span>
                    </div>
                    <img
                      src={row.url}
                      alt={row.name || 'sheet'}
                      style={{ width: '100%', aspectRatio: '1/1', objectFit: 'cover', borderRadius: 'var(--radius-md)' }}
                    />
                    <div className="text-muted" style={{ fontSize: '0.7rem', lineHeight: 1.3 }}>
                      {row.description || '(설명 없음)'}
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button className="btn btn-primary btn-sm" type="button" disabled={selectedCount === 0} onClick={onImport}>
            선택 항목 불러오기
          </button>
        </div>
      </div>
    </div>
  );
}

function ResultsGrid({ items, onSelect, emptyText }) {
  if (items.length === 0) {
    return (
      <div className="empty-state" style={{ minHeight: '220px' }}>
        <div className="empty-icon">🖼️</div>
        <h3>생성 결과 없음</h3>
        <p>{emptyText}</p>
      </div>
    );
  }
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: 'var(--space-sm)',
      }}
    >
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onSelect(item)}
          className="card"
          style={{ padding: 'var(--space-sm)', textAlign: 'left', cursor: 'pointer' }}
        >
          <img
            src={item.url}
            alt={item.label}
            style={{
              width: '100%',
              aspectRatio: '16/9',
              objectFit: 'cover',
              borderRadius: 'var(--radius-md)',
              marginBottom: '8px',
            }}
          />
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            {item.pinned ? '📌 ' : ''}{item.label}
          </div>
        </button>
      ))}
    </div>
  );
}

function MultiAngleTool({
  apiKey,
  disabled,
  selectedCharacterSheets,
  incomingKeyImage,
  onSendToKeyImage,
}) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [externalKeyImage, setExternalKeyImage] = useState(null);
  const [ratio, setRatio] = useState('16:9');
  const [additionalPrompt, setAdditionalPrompt] = useState('');
  const [promptOverrides, setPromptOverrides] = useState({});
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [refinePrompt, setRefinePrompt] = useState('');
  const [running, setRunning] = useState(false);
  const [refining, setRefining] = useState(false);
  const [progress, setProgress] = useState(0);
  const [workerCount, setWorkerCount] = useState(4);
  const [stopRequested, setStopRequested] = useState(false);
  const [error, setError] = useState('');
  const [restored, setRestored] = useState(false);
  const stopRef = useRef(false);
  const selectedId = selected?.id || null;
  const anglePromptRows = useMemo(
    () => CINEMATIC_ANGLES.map((angle, index) => {
      const defaultPrompt = buildMultiAnglePrompt({
        angleName: angle.name,
        angleDescription: angle.description,
        additionalPrompt,
        ratio,
      });
      const override = typeof promptOverrides[index] === 'string' ? promptOverrides[index] : '';
      const finalPrompt = override.trim() ? override : defaultPrompt;
      return {
        index,
        angle,
        defaultPrompt,
        override,
        finalPrompt,
        isCustom: Boolean(override.trim()),
      };
    }),
    [additionalPrompt, promptOverrides, ratio],
  );

  function setPromptOverride(index, value) {
    setPromptOverrides((prev) => {
      const next = { ...prev };
      if (!String(value || '').trim()) {
        delete next[index];
      } else {
        next[index] = value;
      }
      return next;
    });
  }

  useEffect(() => {
    let active = true;
    async function restoreSnapshot() {
      try {
        const snapshot = await loadImageToolSnapshot('multi');
        if (!active || !snapshot) return;
        const restoredResults = Array.isArray(snapshot.results) ? snapshot.results : [];
        setResults(restoredResults);
        if (typeof snapshot.ratio === 'string' && snapshot.ratio) setRatio(snapshot.ratio);
        if (typeof snapshot.additionalPrompt === 'string') setAdditionalPrompt(snapshot.additionalPrompt);
        if (snapshot.promptOverrides && typeof snapshot.promptOverrides === 'object') {
          setPromptOverrides(snapshot.promptOverrides);
        }
        if (typeof snapshot.workerCount === 'number') {
          setWorkerCount(clampWorkerCount(snapshot.workerCount));
        }
        if (snapshot.selectedId) {
          const matched = restoredResults.find((item) => item.id === snapshot.selectedId);
          if (matched) setSelected(matched);
        }
      } catch (snapshotErr) {
        console.error(snapshotErr);
      } finally {
        if (active) setRestored(true);
      }
    }
    void restoreSnapshot();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!restored) return;
    void saveImageToolSnapshot('multi', {
      ratio,
      additionalPrompt,
      selectedId,
      promptOverrides,
      workerCount,
      results,
    });
  }, [additionalPrompt, promptOverrides, ratio, restored, results, selectedId, workerCount]);

  useEffect(() => {
    if (!incomingKeyImage?.token || !incomingKeyImage?.url) return;
    setFile(null);
    setExternalKeyImage(incomingKeyImage);
    setPreview(incomingKeyImage.url);
  }, [incomingKeyImage]);

  async function handleGenerate() {
    if ((!file && !externalKeyImage) || disabled || running) return;
    setRunning(true);
    setStopRequested(false);
    stopRef.current = false;
    setError('');
    setResults([]);
    setProgress(0);
    try {
      const primary = await resolvePrimaryInputImage({ file, externalImage: externalKeyImage });
      const base64 = primary.data;
      const mimeType = primary.mimeType || 'image/png';
      const characterRefs = await buildCharacterSheetInlineReferences(selectedCharacterSheets);
      const status = await runConcurrentTasks({
        items: CINEMATIC_ANGLES,
        workerCount,
        shouldStop: () => stopRef.current,
        runTask: async (angle, i) => {
          const prompt = anglePromptRows[i]?.finalPrompt
            || buildMultiAnglePrompt({
              angleName: angle.name,
              angleDescription: angle.description,
              additionalPrompt,
              ratio,
            });
          const promptWithRefs = withCharacterSheetDirective(prompt, selectedCharacterSheets);
          try {
            let url = '';
            if (characterRefs.length === 0) {
              url = await generateImageWithReference({
                apiKey,
                prompt: promptWithRefs,
                referenceBase64: base64,
                mimeType,
                aspectRatio: ratio,
              });
            } else {
              url = await generateImageWithMultipleReferences({
                apiKey,
                prompt: promptWithRefs,
                images: [
                  { data: base64, mimeType },
                  ...characterRefs,
                ],
                aspectRatio: ratio,
              });
            }
            setResults((prev) => [...prev, createResultItem({ id: `multi-${i}-${Date.now()}`, label: angle.name, url, prompt: promptWithRefs })]);
          } catch (angleErr) {
            console.error(angleErr);
          }
        },
        onDone: (done, total) => {
          setProgress(Math.round((done / total) * 100));
        },
        onTaskError: (taskErr) => {
          console.error(taskErr);
        },
      });
      if (status.stopped) {
        setError('정지 요청으로 새 요청 발행을 중단했습니다. 이미 시작된 요청은 완료될 수 있습니다.');
      }
    } catch (err) {
      setError(err?.message || '이미지 생성 중 오류가 발생했습니다.');
    } finally {
      stopRef.current = false;
      setStopRequested(false);
      setRunning(false);
    }
  }

  async function handleRefine() {
    if (!selected || !refinePrompt.trim() || refining || disabled) return;
    setRefining(true);
    setError('');
    try {
      const selectedInline = await sourceToInlineImage(selected.url, 'image/png');
      const characterRefs = await buildCharacterSheetInlineReferences(selectedCharacterSheets);
      const prompt = withCharacterSheetDirective(
        `Refine this image. Keep composition and identity; apply this change: ${refinePrompt}. Output ratio: ${ratio}.`,
        selectedCharacterSheets,
      );
      let url = '';
      if (characterRefs.length === 0) {
        url = await generateImageWithReference({
          apiKey,
          prompt,
          referenceBase64: selectedInline.data,
          mimeType: selectedInline.mimeType || 'image/png',
          aspectRatio: ratio,
        });
      } else {
        url = await generateImageWithMultipleReferences({
          apiKey,
          prompt,
          images: [
            { data: selectedInline.data, mimeType: selectedInline.mimeType || 'image/png' },
            ...characterRefs,
          ],
          aspectRatio: ratio,
        });
      }
      const updatedAt = new Date().toISOString();
      setResults((prev) => prev.map((item) => (item.id === selected.id ? { ...item, url, updatedAt } : item)));
      setSelected((prev) => (prev ? { ...prev, url, updatedAt } : prev));
      setRefinePrompt('');
    } catch (err) {
      setError(err?.message || '수정 생성 실패');
    } finally {
      setRefining(false);
    }
  }

  async function handleClearHistory() {
    setResults([]);
    setSelected(null);
    setRefinePrompt('');
    setError('');
    setProgress(0);
    await clearImageToolSnapshot('multi');
  }

  function handleStop() {
    if (!running) return;
    stopRef.current = true;
    setStopRequested(true);
  }

  function handleTogglePinSelected() {
    if (!selected) return;
    const nextResults = togglePinned(results, selected.id);
    setResults(nextResults);
    const nextSelected = nextResults.find((item) => item.id === selected.id) || null;
    setSelected(nextSelected);
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 'var(--space-md)' }}>
      <div className="card" style={{ padding: 'var(--space-md)' }}>
        <h3 style={{ marginBottom: 'var(--space-sm)' }}>입력</h3>
        <div className="form-group">
          <label className="form-label">키 이미지</label>
          <input
            type="file"
            accept="image/*"
            className="form-input"
            onChange={(e) => {
              const picked = e.target.files?.[0] || null;
              setFile(picked);
              setExternalKeyImage(null);
              setPreview(picked ? URL.createObjectURL(picked) : '');
            }}
          />
        </div>
        {externalKeyImage && (
          <div className="text-muted" style={{ fontSize: '0.75rem', marginBottom: '6px' }}>
            공용 키 이미지 적용됨: {externalKeyImage.label || '선택 이미지'}
          </div>
        )}
        {preview && (
          <img
            src={preview}
            alt="key"
            style={{ width: '100%', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-sm)' }}
          />
        )}
        <div className="form-group">
          <label className="form-label">화면 비율</label>
          <RatioButtons value={ratio} onChange={setRatio} />
        </div>
        <WorkerCountControl value={workerCount} onChange={setWorkerCount} disabled={running} />
        <div className="form-group">
          <label className="form-label">추가 프롬프트</label>
          <textarea
            className="form-textarea"
            rows={4}
            value={additionalPrompt}
            onChange={(e) => setAdditionalPrompt(e.target.value)}
            placeholder="예: 비 오는 밤, 극사실주의, cinematic lighting"
          />
        </div>
        <details style={{ marginBottom: 'var(--space-sm)' }}>
          <summary style={{ cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
            생성 명령 프롬프트 보기/수정 ({CINEMATIC_ANGLES.length}개)
          </summary>
          <div style={{ marginTop: '8px', display: 'grid', gap: '8px', maxHeight: '320px', overflow: 'auto', paddingRight: '2px' }}>
            <div className="text-muted" style={{ fontSize: '0.74rem' }}>
              각 화각별 실제 생성 프롬프트입니다. 내용을 바꾸면 해당 화각 생성에 바로 반영됩니다.
            </div>
            <div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setPromptOverrides({})}
                disabled={Object.keys(promptOverrides).length === 0}
              >
                전체 기본값 복원
              </button>
            </div>
            {anglePromptRows.map((row) => (
              <details key={row.index} style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '6px 8px' }}>
                <summary style={{ cursor: 'pointer', fontSize: '0.78rem' }}>
                  {row.index + 1}. {row.angle.name}{row.isCustom ? ' (커스텀 적용)' : ''}
                </summary>
                <div style={{ marginTop: '6px', display: 'grid', gap: '6px' }}>
                  <textarea
                    className="form-textarea"
                    rows={5}
                    value={row.finalPrompt}
                    onChange={(e) => setPromptOverride(row.index, e.target.value)}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div className="text-muted" style={{ fontSize: '0.72rem' }}>
                      비우면 기본 프롬프트로 자동 복귀
                    </div>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      disabled={!row.isCustom}
                      onClick={() => setPromptOverride(row.index, '')}
                    >
                      기본값 복원
                    </button>
                  </div>
                </div>
              </details>
            ))}
          </div>
        </details>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-primary" onClick={handleGenerate} disabled={(!file && !externalKeyImage) || disabled || running}>
            {running ? `생성 중... ${progress}%` : `${CINEMATIC_ANGLES.length}개 화각 생성`}
          </button>
          <button className="btn btn-secondary" type="button" onClick={handleStop} disabled={!running}>
            정지
          </button>
        </div>
        {running && stopRequested && (
          <div className="text-muted" style={{ fontSize: '0.75rem', marginTop: '6px' }}>
            정지 요청됨: 현재 처리 중인 워커 완료 후 중단합니다.
          </div>
        )}
        {!!error && <div style={{ color: 'var(--accent-danger)', fontSize: '0.82rem', marginTop: '8px' }}>{error}</div>}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        <div className="card" style={{ padding: 'var(--space-md)' }}>
          <div className="flex-between" style={{ marginBottom: 'var(--space-sm)' }}>
            <h3>결과</h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              {results.length > 0 && (
                <button className="btn btn-secondary btn-sm" onClick={() => results.forEach((r, i) => downloadImage(r.url, `multi-angle-${i + 1}.png`))}>
                  전체 다운로드
                </button>
              )}
              <button className="btn btn-ghost btn-sm" onClick={() => void handleClearHistory()} disabled={results.length === 0}>
                기록 비우기
              </button>
            </div>
          </div>
          <ResultsGrid items={results} onSelect={setSelected} emptyText="키 이미지를 올리고 생성하세요." />
        </div>

        {selected && (
          <div className="card" style={{ padding: 'var(--space-md)' }}>
            <h3 style={{ marginBottom: 'var(--space-sm)' }}>
              선택 이미지 수정: {selected.pinned ? '📌 ' : ''}{selected.label}
            </h3>
            <img
              src={selected.url}
              alt={selected.label}
              style={{ width: '100%', maxHeight: '280px', objectFit: 'contain', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-sm)' }}
            />
            {selected.prompt && (
              <details style={{ marginBottom: 'var(--space-sm)' }}>
                <summary style={{ cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
                  이 이미지 생성 프롬프트 보기
                </summary>
                <textarea
                  className="form-textarea"
                  rows={5}
                  readOnly
                  value={selected.prompt}
                  style={{ marginTop: '6px' }}
                />
              </details>
            )}
            <textarea
              className="form-textarea"
              rows={3}
              value={refinePrompt}
              onChange={(e) => setRefinePrompt(e.target.value)}
              placeholder="예: 얼굴 광원을 더 부드럽게, 배경 안개 추가"
            />
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <button className="btn btn-secondary btn-sm" type="button" onClick={() => onSendToKeyImage?.(selected)}>
                키 이미지로 보내기
              </button>
              <button className="btn btn-ghost btn-sm" type="button" onClick={handleTogglePinSelected}>
                {selected.pinned ? '고정 해제' : '보관 고정'}
              </button>
              <button className="btn btn-primary btn-sm" onClick={handleRefine} disabled={!refinePrompt.trim() || refining || disabled}>
                {refining ? '수정 생성 중...' : '현재 이미지 기반 수정'}
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => downloadImage(selected.url, `${selected.label}.png`)}>
                다운로드
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CharacterSheetTool({
  apiKey,
  disabled,
  selectedCharacterSheets,
  incomingKeyImage,
  onSendToKeyImage,
}) {
  const [templateFile, setTemplateFile] = useState(null);
  const [templatePreview, setTemplatePreview] = useState('');
  const [externalTemplateImage, setExternalTemplateImage] = useState(null);
  const [subjectFiles, setSubjectFiles] = useState([]);
  const [ratio, setRatio] = useState('1:1');
  const [additionalPrompt, setAdditionalPrompt] = useState('');
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [refinePrompt, setRefinePrompt] = useState('');
  const [running, setRunning] = useState(false);
  const [refining, setRefining] = useState(false);
  const [workerCount, setWorkerCount] = useState(4);
  const [stopRequested, setStopRequested] = useState(false);
  const [error, setError] = useState('');
  const [restored, setRestored] = useState(false);
  const stopRef = useRef(false);
  const selectedId = selected?.id || null;

  useEffect(() => {
    let active = true;
    async function restoreSnapshot() {
      try {
        const snapshot = await loadImageToolSnapshot('sheet');
        if (!active || !snapshot) return;
        const restoredResults = Array.isArray(snapshot.results) ? snapshot.results : [];
        setResults(restoredResults);
        if (typeof snapshot.ratio === 'string' && snapshot.ratio) setRatio(snapshot.ratio);
        if (typeof snapshot.additionalPrompt === 'string') setAdditionalPrompt(snapshot.additionalPrompt);
        if (typeof snapshot.workerCount === 'number') {
          setWorkerCount(clampWorkerCount(snapshot.workerCount));
        }
        if (snapshot.selectedId) {
          const matched = restoredResults.find((item) => item.id === snapshot.selectedId);
          if (matched) setSelected(matched);
        }
      } catch (snapshotErr) {
        console.error(snapshotErr);
      } finally {
        if (active) setRestored(true);
      }
    }
    void restoreSnapshot();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!restored) return;
    void saveImageToolSnapshot('sheet', {
      ratio,
      additionalPrompt,
      selectedId,
      workerCount,
      results,
    });
  }, [additionalPrompt, ratio, restored, results, selectedId, workerCount]);

  useEffect(() => {
    if (!incomingKeyImage?.token || !incomingKeyImage?.url) return;
    setTemplateFile(null);
    setExternalTemplateImage(incomingKeyImage);
    setTemplatePreview(incomingKeyImage.url);
  }, [incomingKeyImage]);

  async function handleGenerate() {
    if ((!templateFile && !externalTemplateImage) || subjectFiles.length === 0 || disabled || running) return;
    setRunning(true);
    setStopRequested(false);
    stopRef.current = false;
    setError('');
    setResults([]);
    try {
      const templateInline = await resolvePrimaryInputImage({
        file: templateFile,
        externalImage: externalTemplateImage,
      });
      const characterRefs = await buildCharacterSheetInlineReferences(selectedCharacterSheets);
      const status = await runConcurrentTasks({
        items: subjectFiles,
        workerCount,
        shouldStop: () => stopRef.current,
        runTask: async (subject, i) => {
          const subjectBase64 = await fileToBase64(subject);
          const prompt = withCharacterSheetDirective(
            `Task: Character Sheet Redraw. First image is layout template. Second image is subject character. Keep exact panel layout and redraw subject in template. Additional details: ${additionalPrompt}. Output ratio: ${ratio}.`,
            selectedCharacterSheets,
          );
          const url = await generateImageWithMultipleReferences({
            apiKey,
            prompt,
            images: [
              { data: templateInline.data, mimeType: templateInline.mimeType || 'image/png' },
              { data: subjectBase64, mimeType: subject.type || 'image/png' },
              ...characterRefs,
            ],
            aspectRatio: ratio,
          });
          setResults((prev) => [...prev, createResultItem({ id: `sheet-${i}-${Date.now()}`, label: `변환 결과 ${i + 1}`, url, prompt })]);
        },
        onDone: () => {},
        onTaskError: (taskErr) => {
          console.error(taskErr);
        },
      });
      if (status.stopped) {
        setError('정지 요청으로 새 요청 발행을 중단했습니다. 이미 시작된 요청은 완료될 수 있습니다.');
      }
    } catch (err) {
      setError(err?.message || '양식 생성 실패');
    } finally {
      stopRef.current = false;
      setStopRequested(false);
      setRunning(false);
    }
  }

  async function handleRefine() {
    if (!selected || !refinePrompt.trim() || refining || disabled) return;
    setRefining(true);
    setError('');
    try {
      const selectedInline = await sourceToInlineImage(selected.url, 'image/png');
      const characterRefs = await buildCharacterSheetInlineReferences(selectedCharacterSheets);
      const prompt = withCharacterSheetDirective(
        `Refine this character sheet result: ${refinePrompt}. Keep panel layout and core design.`,
        selectedCharacterSheets,
      );
      const url = await generateImageWithMultipleReferences({
        apiKey,
        prompt,
        images: [
          { data: selectedInline.data, mimeType: selectedInline.mimeType || 'image/png' },
          ...characterRefs,
        ],
        aspectRatio: ratio,
      });
      const updatedAt = new Date().toISOString();
      setResults((prev) => prev.map((item) => (item.id === selected.id ? { ...item, url, updatedAt } : item)));
      setSelected((prev) => (prev ? { ...prev, url, updatedAt } : prev));
      setRefinePrompt('');
    } catch (err) {
      setError(err?.message || '수정 생성 실패');
    } finally {
      setRefining(false);
    }
  }

  async function handleClearHistory() {
    setResults([]);
    setSelected(null);
    setRefinePrompt('');
    setError('');
    await clearImageToolSnapshot('sheet');
  }

  function handleStop() {
    if (!running) return;
    stopRef.current = true;
    setStopRequested(true);
  }

  function handleTogglePinSelected() {
    if (!selected) return;
    const nextResults = togglePinned(results, selected.id);
    setResults(nextResults);
    const nextSelected = nextResults.find((item) => item.id === selected.id) || null;
    setSelected(nextSelected);
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 'var(--space-md)' }}>
      <div className="card" style={{ padding: 'var(--space-md)' }}>
        <h3 style={{ marginBottom: 'var(--space-sm)' }}>입력</h3>
        <div className="form-group">
          <label className="form-label">기준 양식 이미지</label>
          <input
            type="file"
            accept="image/*"
            className="form-input"
            onChange={(e) => {
              const picked = e.target.files?.[0] || null;
              setTemplateFile(picked);
              setExternalTemplateImage(null);
              setTemplatePreview(picked ? URL.createObjectURL(picked) : '');
            }}
          />
        </div>
        {externalTemplateImage && (
          <div className="text-muted" style={{ fontSize: '0.75rem', marginBottom: '6px' }}>
            공용 키 이미지 적용됨: {externalTemplateImage.label || '선택 이미지'}
          </div>
        )}
        {templatePreview && (
          <img src={templatePreview} alt="template" style={{ width: '100%', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-sm)' }} />
        )}
        <div className="form-group">
          <label className="form-label">변환 대상(다중 선택)</label>
          <input
            type="file"
            multiple
            accept="image/*"
            className="form-input"
            onChange={(e) => setSubjectFiles(Array.from(e.target.files || []))}
          />
          <div className="text-muted" style={{ fontSize: '0.75rem', marginTop: '4px' }}>
            {subjectFiles.length > 0 ? `${subjectFiles.length}개 선택됨` : '선택된 파일 없음'}
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">화면 비율</label>
          <RatioButtons value={ratio} onChange={setRatio} />
        </div>
        <WorkerCountControl value={workerCount} onChange={setWorkerCount} disabled={running} />
        <div className="form-group">
          <label className="form-label">추가 프롬프트</label>
          <textarea
            className="form-textarea"
            rows={4}
            value={additionalPrompt}
            onChange={(e) => setAdditionalPrompt(e.target.value)}
            placeholder="예: 흰 배경 유지, 붓터치 제거, 선명도 강화"
          />
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className="btn btn-primary"
            onClick={handleGenerate}
            disabled={(!templateFile && !externalTemplateImage) || subjectFiles.length === 0 || disabled || running}
          >
            {running ? '일괄 생성 중...' : '양식 맞춤 일괄 생성'}
          </button>
          <button className="btn btn-secondary" type="button" onClick={handleStop} disabled={!running}>
            정지
          </button>
        </div>
        {running && stopRequested && (
          <div className="text-muted" style={{ fontSize: '0.75rem', marginTop: '6px' }}>
            정지 요청됨: 현재 처리 중인 워커 완료 후 중단합니다.
          </div>
        )}
        {!!error && <div style={{ color: 'var(--accent-danger)', fontSize: '0.82rem', marginTop: '8px' }}>{error}</div>}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        <div className="card" style={{ padding: 'var(--space-md)' }}>
          <div className="flex-between" style={{ marginBottom: 'var(--space-sm)' }}>
            <h3>결과</h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              {results.length > 0 && (
                <button className="btn btn-secondary btn-sm" onClick={() => results.forEach((r, i) => downloadImage(r.url, `sheet-${i + 1}.png`))}>
                  전체 다운로드
                </button>
              )}
              <button className="btn btn-ghost btn-sm" onClick={() => void handleClearHistory()} disabled={results.length === 0}>
                기록 비우기
              </button>
            </div>
          </div>
          <ResultsGrid items={results} onSelect={setSelected} emptyText="양식+대상 이미지를 넣고 생성하세요." />
        </div>

        {selected && (
          <div className="card" style={{ padding: 'var(--space-md)' }}>
            <h3 style={{ marginBottom: 'var(--space-sm)' }}>
              선택 이미지 수정: {selected.pinned ? '📌 ' : ''}{selected.label}
            </h3>
            <img
              src={selected.url}
              alt={selected.label}
              style={{ width: '100%', maxHeight: '280px', objectFit: 'contain', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-sm)' }}
            />
            {selected.prompt && (
              <details style={{ marginBottom: 'var(--space-sm)' }}>
                <summary style={{ cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
                  이 프레임 생성 프롬프트 보기
                </summary>
                <textarea
                  className="form-textarea"
                  rows={5}
                  readOnly
                  value={selected.prompt}
                  style={{ marginTop: '6px' }}
                />
              </details>
            )}
            <textarea
              className="form-textarea"
              rows={3}
              value={refinePrompt}
              onChange={(e) => setRefinePrompt(e.target.value)}
              placeholder="예: 의상 색상만 변경, 얼굴 라인 정리"
            />
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <button className="btn btn-secondary btn-sm" type="button" onClick={() => onSendToKeyImage?.(selected)}>
                키 이미지로 보내기
              </button>
              <button className="btn btn-ghost btn-sm" type="button" onClick={handleTogglePinSelected}>
                {selected.pinned ? '고정 해제' : '보관 고정'}
              </button>
              <button className="btn btn-primary btn-sm" onClick={handleRefine} disabled={!refinePrompt.trim() || refining || disabled}>
                {refining ? '수정 생성 중...' : '현재 이미지 기반 수정'}
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => downloadImage(selected.url, `${selected.label}.png`)}>
                다운로드
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ActionSceneTool({
  apiKey,
  disabled,
  selectedCharacterSheets,
  incomingKeyImage,
  onSendToKeyImage,
}) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [externalKeyImage, setExternalKeyImage] = useState(null);
  const [ratio, setRatio] = useState('9:16');
  const [additionalPrompt, setAdditionalPrompt] = useState('');
  const [promptOverrides, setPromptOverrides] = useState({});
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [refinePrompt, setRefinePrompt] = useState('');
  const [running, setRunning] = useState(false);
  const [refining, setRefining] = useState(false);
  const [workerCount, setWorkerCount] = useState(4);
  const [stopRequested, setStopRequested] = useState(false);
  const [error, setError] = useState('');
  const [restored, setRestored] = useState(false);
  const stopRef = useRef(false);
  const selectedId = selected?.id || null;
  const actionPromptRows = useMemo(
    () => ACTION_STEPS.map((step, index) => {
      const defaultPrompt = buildActionStepPrompt({
        stepIndex: index,
        stepLabel: step,
        additionalPrompt,
        ratio,
      });
      const override = typeof promptOverrides[index] === 'string' ? promptOverrides[index] : '';
      const finalPrompt = override.trim() ? override : defaultPrompt;
      return {
        index,
        step,
        defaultPrompt,
        override,
        finalPrompt,
        isCustom: Boolean(override.trim()),
      };
    }),
    [additionalPrompt, promptOverrides, ratio],
  );

  function setPromptOverride(index, value) {
    setPromptOverrides((prev) => {
      const next = { ...prev };
      if (!String(value || '').trim()) {
        delete next[index];
      } else {
        next[index] = value;
      }
      return next;
    });
  }

  useEffect(() => {
    let active = true;
    async function restoreSnapshot() {
      try {
        const snapshot = await loadImageToolSnapshot('action');
        if (!active || !snapshot) return;
        const restoredResults = Array.isArray(snapshot.results) ? snapshot.results : [];
        setResults(restoredResults);
        if (typeof snapshot.ratio === 'string' && snapshot.ratio) setRatio(snapshot.ratio);
        if (typeof snapshot.additionalPrompt === 'string') setAdditionalPrompt(snapshot.additionalPrompt);
        if (snapshot.promptOverrides && typeof snapshot.promptOverrides === 'object') {
          setPromptOverrides(snapshot.promptOverrides);
        }
        if (typeof snapshot.workerCount === 'number') {
          setWorkerCount(clampWorkerCount(snapshot.workerCount));
        }
        if (snapshot.selectedId) {
          const matched = restoredResults.find((item) => item.id === snapshot.selectedId);
          if (matched) setSelected(matched);
        }
      } catch (snapshotErr) {
        console.error(snapshotErr);
      } finally {
        if (active) setRestored(true);
      }
    }
    void restoreSnapshot();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!restored) return;
    void saveImageToolSnapshot('action', {
      ratio,
      additionalPrompt,
      selectedId,
      promptOverrides,
      workerCount,
      results,
    });
  }, [additionalPrompt, promptOverrides, ratio, restored, results, selectedId, workerCount]);

  useEffect(() => {
    if (!incomingKeyImage?.token || !incomingKeyImage?.url) return;
    setFile(null);
    setExternalKeyImage(incomingKeyImage);
    setPreview(incomingKeyImage.url);
  }, [incomingKeyImage]);

  async function handleGenerate() {
    if ((!file && !externalKeyImage) || disabled || running) return;
    setRunning(true);
    setStopRequested(false);
    stopRef.current = false;
    setError('');
    setResults([]);
    try {
      const primary = await resolvePrimaryInputImage({ file, externalImage: externalKeyImage });
      const base64 = primary.data;
      const mimeType = primary.mimeType || 'image/png';
      const characterRefs = await buildCharacterSheetInlineReferences(selectedCharacterSheets);
      const status = await runConcurrentTasks({
        items: ACTION_STEPS,
        workerCount,
        shouldStop: () => stopRef.current,
        runTask: async (step, i) => {
          const prompt = actionPromptRows[i]?.finalPrompt
            || buildActionStepPrompt({
              stepIndex: i,
              stepLabel: step,
              additionalPrompt,
              ratio,
            });
          const promptWithRefs = withCharacterSheetDirective(prompt, selectedCharacterSheets);
          let url = '';
          if (characterRefs.length === 0) {
            url = await generateImageWithReference({
              apiKey,
              prompt: promptWithRefs,
              referenceBase64: base64,
              mimeType,
              aspectRatio: ratio,
            });
          } else {
            url = await generateImageWithMultipleReferences({
              apiKey,
              prompt: promptWithRefs,
              images: [
                { data: base64, mimeType },
                ...characterRefs,
              ],
              aspectRatio: ratio,
            });
          }
          setResults((prev) => [...prev, createResultItem({ id: `action-${i}-${Date.now()}`, label: `STEP ${i + 1} - ${step}`, url, prompt: promptWithRefs })]);
        },
        onDone: () => {},
        onTaskError: (taskErr) => {
          console.error(taskErr);
        },
      });
      if (status.stopped) {
        setError('정지 요청으로 새 요청 발행을 중단했습니다. 이미 시작된 요청은 완료될 수 있습니다.');
      }
    } catch (err) {
      setError(err?.message || '액션 시퀀스 생성 실패');
    } finally {
      stopRef.current = false;
      setStopRequested(false);
      setRunning(false);
    }
  }

  async function handleRefine() {
    if (!selected || !refinePrompt.trim() || refining || disabled) return;
    setRefining(true);
    setError('');
    try {
      const selectedInline = await sourceToInlineImage(selected.url, 'image/png');
      const characterRefs = await buildCharacterSheetInlineReferences(selectedCharacterSheets);
      const prompt = withCharacterSheetDirective(
        `Refine this action frame: ${refinePrompt}. Keep motion energy and character identity.`,
        selectedCharacterSheets,
      );
      let url = '';
      if (characterRefs.length === 0) {
        url = await generateImageWithReference({
          apiKey,
          prompt,
          referenceBase64: selectedInline.data,
          mimeType: selectedInline.mimeType || 'image/png',
          aspectRatio: ratio,
        });
      } else {
        url = await generateImageWithMultipleReferences({
          apiKey,
          prompt,
          images: [
            { data: selectedInline.data, mimeType: selectedInline.mimeType || 'image/png' },
            ...characterRefs,
          ],
          aspectRatio: ratio,
        });
      }
      const updatedAt = new Date().toISOString();
      setResults((prev) => prev.map((item) => (item.id === selected.id ? { ...item, url, updatedAt } : item)));
      setSelected((prev) => (prev ? { ...prev, url, updatedAt } : prev));
      setRefinePrompt('');
    } catch (err) {
      setError(err?.message || '수정 생성 실패');
    } finally {
      setRefining(false);
    }
  }

  async function handleClearHistory() {
    setResults([]);
    setSelected(null);
    setRefinePrompt('');
    setError('');
    await clearImageToolSnapshot('action');
  }

  function handleStop() {
    if (!running) return;
    stopRef.current = true;
    setStopRequested(true);
  }

  function handleTogglePinSelected() {
    if (!selected) return;
    const nextResults = togglePinned(results, selected.id);
    setResults(nextResults);
    const nextSelected = nextResults.find((item) => item.id === selected.id) || null;
    setSelected(nextSelected);
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 'var(--space-md)' }}>
      <div className="card" style={{ padding: 'var(--space-md)' }}>
        <h3 style={{ marginBottom: 'var(--space-sm)' }}>입력</h3>
        <div className="form-group">
          <label className="form-label">시작 프레임</label>
          <input
            type="file"
            accept="image/*"
            className="form-input"
            onChange={(e) => {
              const picked = e.target.files?.[0] || null;
              setFile(picked);
              setExternalKeyImage(null);
              setPreview(picked ? URL.createObjectURL(picked) : '');
            }}
          />
        </div>
        {externalKeyImage && (
          <div className="text-muted" style={{ fontSize: '0.75rem', marginBottom: '6px' }}>
            공용 키 이미지 적용됨: {externalKeyImage.label || '선택 이미지'}
          </div>
        )}
        {preview && (
          <img src={preview} alt="action-key" style={{ width: '100%', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-sm)' }} />
        )}
        <div className="form-group">
          <label className="form-label">화면 비율</label>
          <RatioButtons value={ratio} onChange={setRatio} />
        </div>
        <WorkerCountControl value={workerCount} onChange={setWorkerCount} disabled={running} />
        <div className="form-group">
          <label className="form-label">추가 프롬프트</label>
          <textarea
            className="form-textarea"
            rows={4}
            value={additionalPrompt}
            onChange={(e) => setAdditionalPrompt(e.target.value)}
            placeholder="예: 번개 이펙트, 폭발 파티클, 스모크 강화"
          />
        </div>
        <details style={{ marginBottom: 'var(--space-sm)' }}>
          <summary style={{ cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
            액션 시퀀스 명령 프롬프트 보기/수정 ({ACTION_STEPS.length}개)
          </summary>
          <div style={{ marginTop: '8px', display: 'grid', gap: '8px', maxHeight: '320px', overflow: 'auto', paddingRight: '2px' }}>
            <div className="text-muted" style={{ fontSize: '0.74rem' }}>
              STEP별 실제 생성 프롬프트입니다. 수정하면 해당 STEP 생성에 즉시 반영됩니다.
            </div>
            <div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setPromptOverrides({})}
                disabled={Object.keys(promptOverrides).length === 0}
              >
                전체 기본값 복원
              </button>
            </div>
            {actionPromptRows.map((row) => (
              <details key={row.index} style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '6px 8px' }}>
                <summary style={{ cursor: 'pointer', fontSize: '0.78rem' }}>
                  STEP {row.index + 1}. {row.step}{row.isCustom ? ' (커스텀 적용)' : ''}
                </summary>
                <div style={{ marginTop: '6px', display: 'grid', gap: '6px' }}>
                  <textarea
                    className="form-textarea"
                    rows={5}
                    value={row.finalPrompt}
                    onChange={(e) => setPromptOverride(row.index, e.target.value)}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div className="text-muted" style={{ fontSize: '0.72rem' }}>
                      비우면 기본 프롬프트로 자동 복귀
                    </div>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      disabled={!row.isCustom}
                      onClick={() => setPromptOverride(row.index, '')}
                    >
                      기본값 복원
                    </button>
                  </div>
                </div>
              </details>
            ))}
          </div>
        </details>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-primary" onClick={handleGenerate} disabled={(!file && !externalKeyImage) || disabled || running}>
            {running ? '시퀀스 생성 중...' : `${ACTION_STEPS.length}단계 액션 생성`}
          </button>
          <button className="btn btn-secondary" type="button" onClick={handleStop} disabled={!running}>
            정지
          </button>
        </div>
        {running && stopRequested && (
          <div className="text-muted" style={{ fontSize: '0.75rem', marginTop: '6px' }}>
            정지 요청됨: 현재 처리 중인 워커 완료 후 중단합니다.
          </div>
        )}
        {!!error && <div style={{ color: 'var(--accent-danger)', fontSize: '0.82rem', marginTop: '8px' }}>{error}</div>}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        <div className="card" style={{ padding: 'var(--space-md)' }}>
          <div className="flex-between" style={{ marginBottom: 'var(--space-sm)' }}>
            <h3>결과</h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              {results.length > 0 && (
                <button className="btn btn-secondary btn-sm" onClick={() => results.forEach((r, i) => downloadImage(r.url, `action-${i + 1}.png`))}>
                  전체 다운로드
                </button>
              )}
              <button className="btn btn-ghost btn-sm" onClick={() => void handleClearHistory()} disabled={results.length === 0}>
                기록 비우기
              </button>
            </div>
          </div>
          <ResultsGrid items={results} onSelect={setSelected} emptyText="시작 프레임을 넣고 시퀀스를 생성하세요." />
        </div>

        {selected && (
          <div className="card" style={{ padding: 'var(--space-md)' }}>
            <h3 style={{ marginBottom: 'var(--space-sm)' }}>
              선택 프레임 수정: {selected.pinned ? '📌 ' : ''}{selected.label}
            </h3>
            <img
              src={selected.url}
              alt={selected.label}
              style={{ width: '100%', maxHeight: '280px', objectFit: 'contain', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-sm)' }}
            />
            {selected.prompt && (
              <details style={{ marginBottom: 'var(--space-sm)' }}>
                <summary style={{ cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
                  이 프레임 생성 프롬프트 보기
                </summary>
                <textarea
                  className="form-textarea"
                  rows={5}
                  readOnly
                  value={selected.prompt}
                  style={{ marginTop: '6px' }}
                />
              </details>
            )}
            <textarea
              className="form-textarea"
              rows={3}
              value={refinePrompt}
              onChange={(e) => setRefinePrompt(e.target.value)}
              placeholder="예: 불꽃 범위를 넓히고 모션블러 강화"
            />
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <button className="btn btn-secondary btn-sm" type="button" onClick={() => onSendToKeyImage?.(selected)}>
                키 이미지로 보내기
              </button>
              <button className="btn btn-ghost btn-sm" type="button" onClick={handleTogglePinSelected}>
                {selected.pinned ? '고정 해제' : '보관 고정'}
              </button>
              <button className="btn btn-primary btn-sm" onClick={handleRefine} disabled={!refinePrompt.trim() || refining || disabled}>
                {refining ? '수정 생성 중...' : '현재 프레임 기반 수정'}
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => downloadImage(selected.url, `${selected.label}.png`)}>
                다운로드
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ToneMannerTool({
  apiKey,
  disabled,
  selectedCharacterSheets,
  incomingKeyImage,
  onSendToKeyImage,
}) {
  const [styleFile, setStyleFile] = useState(null);
  const [stylePreview, setStylePreview] = useState('');
  const [externalStyleImage, setExternalStyleImage] = useState(null);
  const [targetFiles, setTargetFiles] = useState([]);
  const [ratio, setRatio] = useState('1:1');
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [running, setRunning] = useState(false);
  const [workerCount, setWorkerCount] = useState(4);
  const [stopRequested, setStopRequested] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [error, setError] = useState('');
  const [restored, setRestored] = useState(false);
  const stopRef = useRef(false);
  const selectedId = selected?.id || null;

  useEffect(() => {
    let active = true;
    async function restoreSnapshot() {
      try {
        const snapshot = await loadImageToolSnapshot('tone');
        if (!active || !snapshot) return;
        const restoredResults = Array.isArray(snapshot.results) ? snapshot.results : [];
        setResults(restoredResults);
        if (typeof snapshot.ratio === 'string' && snapshot.ratio) setRatio(snapshot.ratio);
        if (typeof snapshot.workerCount === 'number') {
          setWorkerCount(clampWorkerCount(snapshot.workerCount));
        }
        if (snapshot.selectedId) {
          const matched = restoredResults.find((item) => item.id === snapshot.selectedId);
          if (matched) setSelected(matched);
        }
      } catch (snapshotErr) {
        console.error(snapshotErr);
      } finally {
        if (active) setRestored(true);
      }
    }
    void restoreSnapshot();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!restored) return;
    void saveImageToolSnapshot('tone', {
      ratio,
      workerCount,
      additionalPrompt: '',
      selectedId,
      results,
    });
  }, [ratio, restored, results, selectedId, workerCount]);

  useEffect(() => {
    if (!incomingKeyImage?.token || !incomingKeyImage?.url) return;
    setStyleFile(null);
    setExternalStyleImage(incomingKeyImage);
    setStylePreview(incomingKeyImage.url);
  }, [incomingKeyImage]);

  async function handleGenerate() {
    if ((!styleFile && !externalStyleImage) || targetFiles.length === 0 || disabled || running) return;
    setRunning(true);
    setStopRequested(false);
    stopRef.current = false;
    setError('');
    setResults([]);
    try {
      const styleInline = await resolvePrimaryInputImage({
        file: styleFile,
        externalImage: externalStyleImage,
      });
      const characterRefs = await buildCharacterSheetInlineReferences(selectedCharacterSheets);
      const limitedTargets = targetFiles.slice(0, 30);
      const status = await runConcurrentTasks({
        items: limitedTargets,
        workerCount,
        shouldStop: () => stopRef.current,
        runTask: async (target, i) => {
          const targetBase64 = await fileToBase64(target);
          let url = '';
          if (characterRefs.length === 0) {
            url = await applyToneAndManner({
              apiKey,
              targetBase64,
              styleBase64: styleInline.data,
              mimeType: target.type || 'image/png',
              aspectRatio: ratio,
            });
          } else {
            const prompt = withCharacterSheetDirective(
              'Modify the target image to follow the tone, color palette, lighting, and overall style of the style reference. Keep composition and main subject identity.',
              selectedCharacterSheets,
            );
            url = await generateImageWithMultipleReferences({
              apiKey,
              prompt,
              images: [
                { data: styleInline.data, mimeType: styleInline.mimeType || 'image/png' },
                { data: targetBase64, mimeType: target.type || 'image/png' },
                ...characterRefs,
              ],
              aspectRatio: ratio,
            });
          }
          setResults((prev) => [...prev, createResultItem({ id: `tone-${i}-${Date.now()}`, label: target.name || `target-${i + 1}`, url })]);
        },
        onDone: (done, total) => {
          setProgressText(`${done}/${total}`);
        },
        onTaskError: (taskErr) => {
          console.error(taskErr);
        },
      });
      if (status.stopped) {
        setError('정지 요청으로 새 요청 발행을 중단했습니다. 이미 시작된 요청은 완료될 수 있습니다.');
      }
    } catch (err) {
      setError(err?.message || '톤앤매너 보정 실패');
    } finally {
      stopRef.current = false;
      setStopRequested(false);
      setRunning(false);
      setProgressText('');
    }
  }

  async function handleClearHistory() {
    setResults([]);
    setSelected(null);
    setError('');
    await clearImageToolSnapshot('tone');
  }

  function handleStop() {
    if (!running) return;
    stopRef.current = true;
    setStopRequested(true);
  }

  function handleTogglePinSelected() {
    if (!selected) return;
    const nextResults = togglePinned(results, selected.id);
    setResults(nextResults);
    const nextSelected = nextResults.find((item) => item.id === selected.id) || null;
    setSelected(nextSelected);
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 'var(--space-md)' }}>
      <div className="card" style={{ padding: 'var(--space-md)' }}>
        <h3 style={{ marginBottom: 'var(--space-sm)' }}>입력</h3>
        <div className="form-group">
          <label className="form-label">스타일 레퍼런스</label>
          <input
            type="file"
            accept="image/*"
            className="form-input"
            onChange={(e) => {
              const picked = e.target.files?.[0] || null;
              setStyleFile(picked);
              setExternalStyleImage(null);
              setStylePreview(picked ? URL.createObjectURL(picked) : '');
            }}
          />
        </div>
        {externalStyleImage && (
          <div className="text-muted" style={{ fontSize: '0.75rem', marginBottom: '6px' }}>
            공용 키 이미지 적용됨: {externalStyleImage.label || '선택 이미지'}
          </div>
        )}
        {stylePreview && (
          <img src={stylePreview} alt="style-reference" style={{ width: '100%', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-sm)' }} />
        )}
        <div className="form-group">
          <label className="form-label">타겟 이미지(최대 30개)</label>
          <input
            type="file"
            multiple
            accept="image/*"
            className="form-input"
            onChange={(e) => setTargetFiles(Array.from(e.target.files || []))}
          />
          <div className="text-muted" style={{ fontSize: '0.75rem', marginTop: '4px' }}>
            {targetFiles.length > 0 ? `${Math.min(targetFiles.length, 30)}개 선택됨` : '선택된 파일 없음'}
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">화면 비율</label>
          <RatioButtons value={ratio} onChange={setRatio} />
        </div>
        <WorkerCountControl value={workerCount} onChange={setWorkerCount} disabled={running} />
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className="btn btn-primary"
            onClick={handleGenerate}
            disabled={(!styleFile && !externalStyleImage) || targetFiles.length === 0 || disabled || running}
          >
            {running ? `일괄 보정 중... ${progressText}` : '대량 일괄 보정 시작'}
          </button>
          <button className="btn btn-secondary" type="button" onClick={handleStop} disabled={!running}>
            정지
          </button>
        </div>
        {running && stopRequested && (
          <div className="text-muted" style={{ fontSize: '0.75rem', marginTop: '6px' }}>
            정지 요청됨: 현재 처리 중인 워커 완료 후 중단합니다.
          </div>
        )}
        {!!error && <div style={{ color: 'var(--accent-danger)', fontSize: '0.82rem', marginTop: '8px' }}>{error}</div>}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        <div className="card" style={{ padding: 'var(--space-md)' }}>
          <div className="flex-between" style={{ marginBottom: 'var(--space-sm)' }}>
            <h3>결과</h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              {results.length > 0 && (
                <button className="btn btn-secondary btn-sm" onClick={() => results.forEach((r, i) => downloadImage(r.url, `tone-${i + 1}.png`))}>
                  전체 다운로드
                </button>
              )}
              <button className="btn btn-ghost btn-sm" onClick={() => void handleClearHistory()} disabled={results.length === 0}>
                기록 비우기
              </button>
            </div>
          </div>
          <ResultsGrid items={results} onSelect={setSelected} emptyText="스타일/타겟 이미지를 넣고 보정을 시작하세요." />
        </div>

        {selected && (
          <div className="card" style={{ padding: 'var(--space-md)' }}>
            <h3 style={{ marginBottom: 'var(--space-sm)' }}>
              선택 이미지: {selected.pinned ? '📌 ' : ''}{selected.label}
            </h3>
            <img
              src={selected.url}
              alt={selected.label}
              style={{ width: '100%', maxHeight: '320px', objectFit: 'contain', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-sm)' }}
            />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-secondary btn-sm" type="button" onClick={() => onSendToKeyImage?.(selected)}>
                키 이미지로 보내기
              </button>
              <button className="btn btn-ghost btn-sm" type="button" onClick={handleTogglePinSelected}>
                {selected.pinned ? '고정 해제' : '보관 고정'}
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => downloadImage(selected.url, `${selected.label}.png`)}>
                다운로드
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ImageToolPage() {
  const envApiKey = useMemo(() => import.meta.env.VITE_GEMINI_API_KEY || '', []);
  const [apiKeyInput, setApiKeyInput] = useState(() => localStorage.getItem(GEMINI_KEY_STORAGE) || envApiKey);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(GEMINI_KEY_STORAGE) || envApiKey);
  const [mode, setMode] = useState('multi');
  const [characterSheets, setCharacterSheets] = useState([]);
  const [selectedCharacterSheetIds, setSelectedCharacterSheetIds] = useState(() => readSelectedCharacterSheetIds());
  const [sheetLoading, setSheetLoading] = useState(false);
  const [sheetUploading, setSheetUploading] = useState(false);
  const [sheetSavingId, setSheetSavingId] = useState('');
  const [sheetInfo, setSheetInfo] = useState('');
  const [sheetError, setSheetError] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerRows, setPickerRows] = useState([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerError, setPickerError] = useState('');
  const [pickerSelectedKeys, setPickerSelectedKeys] = useState([]);
  const [authUser, setAuthUser] = useState(() => auth?.currentUser || null);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState('');
  const [sharedKeyImage, setSharedKeyImage] = useState(null);

  const hasApiKey = Boolean(String(apiKey).trim());
  const isSignedIn = Boolean(authUser?.uid);
  const userLabel = authUser?.email || authUser?.displayName || authUser?.uid || '';
  const selectedCharacterSheets = useMemo(() => {
    const byId = new Map(characterSheets.map((sheet) => [sheet.id, sheet]));
    return selectedCharacterSheetIds
      .map((sheetId, index) => {
        const sheet = byId.get(sheetId);
        if (!sheet) return null;
        return { ...sheet, slot: index + 1 };
      })
      .filter(Boolean);
  }, [characterSheets, selectedCharacterSheetIds]);

  function saveApiKey() {
    const normalized = String(apiKeyInput || '').trim();
    if (normalized) {
      localStorage.setItem(GEMINI_KEY_STORAGE, normalized);
      setApiKey(normalized);
      return;
    }
    localStorage.removeItem(GEMINI_KEY_STORAGE);
    setApiKey('');
  }

  function handleSendToKeyImage(image) {
    if (!image?.url) return;
    const token = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setSharedKeyImage({
      token,
      url: image.url,
      label: image.label || '선택 이미지',
      mimeType: image.mimeType || 'image/png',
    });
  }

  function clearSharedKeyImage() {
    setSharedKeyImage(null);
  }

  useEffect(() => {
    const unsubscribe = onFirebaseAuthChanged((user) => {
      setAuthUser(user || null);
      setAuthError('');
      setSheetError('');
    });
    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    let active = true;
    async function finalizeRedirectLogin() {
      try {
        const user = await consumeGoogleRedirectResult();
        if (!active || !user) return;
        setSheetInfo(`Google 로그인 완료: ${user.email || user.uid}`);
      } catch (err) {
        if (!active) return;
        setAuthError(err?.message || 'Google redirect 로그인 처리에 실패했습니다.');
      }
    }
    void finalizeRedirectLogin();
    return () => {
      active = false;
    };
  }, []);

  async function handleGoogleSignIn() {
    setAuthBusy(true);
    setAuthError('');
    setSheetInfo('');
    try {
      await signInWithGoogle();
      setSheetInfo('Google 로그인 페이지로 이동합니다...');
    } catch (err) {
      setAuthError(err?.message || 'Google 로그인에 실패했습니다.');
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleSignOut() {
    setAuthBusy(true);
    setAuthError('');
    setSheetInfo('');
    try {
      await signOutFirebaseAuth();
      setSheetInfo('로그아웃했습니다.');
    } catch (err) {
      setAuthError(err?.message || '로그아웃에 실패했습니다.');
    } finally {
      setAuthBusy(false);
    }
  }

  useEffect(() => {
    localStorage.setItem(CHARACTER_SHEET_SELECTION_STORAGE, JSON.stringify(selectedCharacterSheetIds));
  }, [selectedCharacterSheetIds]);

  const refreshCharacterSheets = useCallback(async ({ quiet = false } = {}) => {
    if (!authUser?.uid) {
      setCharacterSheets((prev) => prev.filter((item) => item.readOnly));
      setSelectedCharacterSheetIds((prev) => prev.filter((id) => id.startsWith('imported_')));
      if (!quiet) {
        setSheetError('Google 로그인 후 불러오기를 사용할 수 있습니다.');
      }
      return;
    }
    if (!quiet) setSheetLoading(true);
    setSheetError('');
    if (!quiet) setSheetInfo('');
    try {
      const rows = await listCharacterSheets();
      setCharacterSheets((prev) => {
        const imported = prev.filter((item) => item.readOnly);
        const nextBase = rows.map((row) => ({ ...row, readOnly: false }));
        const next = [...nextBase];
        for (const importedItem of imported) {
          const duplicate = next.some((item) => (
            (importedItem.storagePath && item.storagePath && importedItem.storagePath === item.storagePath)
            || importedItem.url === item.url
          ));
          if (!duplicate) {
            next.push(importedItem);
          }
        }
        return next;
      });
      setSelectedCharacterSheetIds((prev) => prev.filter((id) => (
        rows.some((row) => row.id === id) || id.startsWith('imported_')
      )));
      if (!quiet) {
        setSheetInfo(rows.length > 0 ? `${rows.length}개 시트를 불러왔습니다.` : '불러온 시트가 없습니다.');
      }
    } catch (err) {
      setSheetError(err?.message || '캐릭터 시트 목록을 불러오지 못했습니다.');
    } finally {
      if (!quiet) setSheetLoading(false);
    }
  }, [authUser?.uid]);

  useEffect(() => {
    if (!authUser?.uid) return;
    void refreshCharacterSheets();
  }, [authUser?.uid, refreshCharacterSheets]);

  async function handleUploadCharacterSheets(files) {
    if (!Array.isArray(files) || files.length === 0 || sheetUploading) return;
    if (!authUser?.uid) {
      setSheetError('Google 로그인 후 업로드할 수 있습니다.');
      return;
    }
    setSheetUploading(true);
    setSheetError('');
    setSheetInfo('');
    try {
      const uploaded = [];
      for (const file of files) {
        const row = await uploadCharacterSheet(file);
        uploaded.push(row);
      }
      if (uploaded.length > 0) {
        setCharacterSheets((prev) => {
          const uploadedIdSet = new Set(uploaded.map((row) => row.id));
          const rest = prev.filter((row) => !uploadedIdSet.has(row.id));
          return [...uploaded.map((row) => ({ ...row, readOnly: false })), ...rest];
        });
        setSelectedCharacterSheetIds((prev) => [...new Set([...prev, ...uploaded.map((row) => row.id)])]);
        setSheetInfo(`${uploaded.length}개 시트를 업로드하고 선택했습니다.`);
      }
    } catch (err) {
      setSheetError(err?.message || '캐릭터 시트 업로드에 실패했습니다.');
    } finally {
      setSheetUploading(false);
      await refreshCharacterSheets({ quiet: true });
    }
  }

  async function handleDeleteCharacterSheet(sheet) {
    setSheetError('');
    setSheetInfo('');
    if (sheet?.readOnly) {
      setCharacterSheets((prev) => prev.filter((row) => row.id !== sheet.id));
      setSelectedCharacterSheetIds((prev) => prev.filter((id) => id !== sheet.id));
      setSheetInfo('불러온 목록에서 제거했습니다. (Firebase 원본은 유지)');
      return;
    }
    if (!authUser?.uid) {
      setSheetError('Google 로그인 후 삭제할 수 있습니다.');
      return;
    }
    try {
      await deleteCharacterSheet(sheet);
      if (sheet?.url) {
        inlineImageCache.delete(sheet.url);
      }
      setCharacterSheets((prev) => prev.filter((row) => row.id !== sheet.id));
      setSelectedCharacterSheetIds((prev) => prev.filter((id) => id !== sheet.id));
      setSheetInfo('캐릭터 시트를 삭제했습니다.');
    } catch (err) {
      setSheetError(err?.message || '캐릭터 시트 삭제에 실패했습니다.');
    }
  }

  function handleToggleCharacterSheet(sheetId) {
    setSelectedCharacterSheetIds((prev) => (
      prev.includes(sheetId)
        ? prev.filter((id) => id !== sheetId)
        : [...prev, sheetId]
    ));
  }

  function handleCharacterSheetDescriptionChange(sheetId, description) {
    setCharacterSheets((prev) => prev.map((sheet) => (
      sheet.id === sheetId
        ? { ...sheet, description }
        : sheet
    )));
  }

  async function handleCharacterSheetDescriptionBlur(sheetId, description) {
    setSheetError('');
    const target = characterSheets.find((sheet) => sheet.id === sheetId);
    if (target?.readOnly) {
      setSheetInfo('외부 목록에서 가져온 시트 설명은 현재 세션에만 반영됩니다.');
      return;
    }
    if (!authUser?.uid) {
      setSheetError('Google 로그인 후 설명을 저장할 수 있습니다.');
      return;
    }
    setSheetSavingId(sheetId);
    try {
      const patch = await updateCharacterSheet(sheetId, { description });
      setCharacterSheets((prev) => prev.map((sheet) => (
        sheet.id === sheetId
          ? { ...sheet, ...patch }
          : sheet
      )));
    } catch (err) {
      setSheetError(err?.message || '슬롯 설명 저장에 실패했습니다.');
    } finally {
      setSheetSavingId('');
    }
  }

  async function handleOpenPicker() {
    if (!authUser?.uid) {
      setPickerOpen(true);
      setPickerRows([]);
      setPickerSelectedKeys([]);
      setPickerError('Google 로그인 후 Firebase 목록을 조회할 수 있습니다.');
      return;
    }
    setPickerOpen(true);
    setPickerLoading(true);
    setPickerError('');
    try {
      const rows = await browseCharacterSheets({ includeShared: false });
      const nextRows = rows.map((row) => ({
        ...row,
        key: `${row.ownerUid || 'unknown'}:${row.id}:${row.storagePath || row.url}`,
      }));
      setPickerRows(nextRows);
      setPickerSelectedKeys([]);
      if (nextRows.length === 0) {
        setPickerError(`불러올 시트가 없습니다. 현재 UID: ${authUser.uid}`);
      }
    } catch (err) {
      setPickerError(err?.message || 'Firebase 목록을 불러오지 못했습니다.');
    } finally {
      setPickerLoading(false);
    }
  }

  async function handleRefreshPicker() {
    if (!authUser?.uid) {
      setPickerRows([]);
      setPickerSelectedKeys([]);
      setPickerError('Google 로그인 후 Firebase 목록을 조회할 수 있습니다.');
      return;
    }
    setPickerLoading(true);
    setPickerError('');
    try {
      const rows = await browseCharacterSheets({ includeShared: false });
      const nextRows = rows.map((row) => ({
        ...row,
        key: `${row.ownerUid || 'unknown'}:${row.id}:${row.storagePath || row.url}`,
      }));
      setPickerRows(nextRows);
      if (nextRows.length === 0) {
        setPickerError(`불러올 시트가 없습니다. 현재 UID: ${authUser.uid}`);
      }
    } catch (err) {
      setPickerError(err?.message || 'Firebase 목록을 다시 불러오지 못했습니다.');
    } finally {
      setPickerLoading(false);
    }
  }

  function handleTogglePickerRow(key) {
    setPickerSelectedKeys((prev) => (
      prev.includes(key)
        ? prev.filter((k) => k !== key)
        : [...prev, key]
    ));
  }

  function handleImportFromPicker() {
    if (pickerSelectedKeys.length === 0) return;
    const selectedSet = new Set(pickerSelectedKeys);
    const chosen = pickerRows.filter((row) => selectedSet.has(row.key));
    if (chosen.length === 0) return;

    const idsToSelect = [];
    setCharacterSheets((prev) => {
      const next = [...prev];
      for (const row of chosen) {
        const existing = next.find((item) => (
          (row.storagePath && item.storagePath && item.storagePath === row.storagePath)
          || item.url === row.url
        ));
        if (existing) {
          idsToSelect.push(existing.id);
          continue;
        }
        const canManage = Boolean(row.ownerUid) && row.ownerUid === authUser?.uid;
        const nextId = canManage ? row.id : importedSheetIdFromRow(row);
        idsToSelect.push(nextId);
        next.unshift({
          ...row,
          id: nextId,
          readOnly: !canManage,
        });
      }
      return next;
    });

    setSelectedCharacterSheetIds((prev) => {
      const merged = [...prev, ...idsToSelect];
      return Array.from(new Set(merged));
    });

    setSheetInfo(`${idsToSelect.length}개 시트를 목록에서 불러와 선택했습니다.`);
    setPickerOpen(false);
  }

  return (
    <div className="section" style={{ animation: 'fadeIn 300ms ease' }}>
      <div className="section-title">
        <span className="section-icon">🖼️</span>
        이미지 생성 보정 모듈
      </div>
      <div className="text-muted" style={{ marginBottom: 'var(--space-sm)' }}>
        생성 결과는 자동 저장됩니다. 새로고침/탭 이동 후에도 복원되며, 고정하지 않은 결과는 {IMAGE_TOOL_RETENTION_DAYS}일 후 자동 정리됩니다.
      </div>

      <div className="card" style={{ marginBottom: 'var(--space-md)', padding: 'var(--space-md)' }}>
        <div className="flex-between" style={{ alignItems: 'center' }}>
          <div>
            <div className="form-label" style={{ marginBottom: '4px' }}>Firebase 계정</div>
            <div className="text-muted" style={{ fontSize: '0.78rem' }}>
              {isSignedIn ? `로그인됨: ${userLabel}` : '로그인 안됨'}
            </div>
            {isSignedIn && (
              <div className="text-muted" style={{ fontSize: '0.72rem', marginTop: '2px' }}>
                UID: {authUser.uid}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {isSignedIn ? (
              <button className="btn btn-secondary btn-sm" type="button" onClick={() => void handleSignOut()} disabled={authBusy}>
                {authBusy ? '처리 중...' : '로그아웃'}
              </button>
            ) : (
              <button className="btn btn-primary btn-sm" type="button" onClick={() => void handleGoogleSignIn()} disabled={authBusy}>
                {authBusy ? '로그인 중...' : 'Google 로그인'}
              </button>
            )}
          </div>
        </div>
        {!!authError && (
          <div style={{ color: 'var(--accent-danger)', fontSize: '0.78rem', marginTop: '8px' }}>
            {authError}
          </div>
        )}
      </div>

      <div className="card" style={{ marginBottom: 'var(--space-md)', padding: 'var(--space-md)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px', alignItems: 'end' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Gemini API Key</label>
            <input
              type="password"
              className="form-input"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder="AIza..."
            />
          </div>
          <button className="btn btn-primary btn-sm" onClick={saveApiKey}>
            키 저장
          </button>
        </div>
        <div className="text-muted" style={{ fontSize: '0.75rem', marginTop: '6px' }}>
          {hasApiKey ? 'API 키가 설정되어 있습니다.' : 'API 키를 저장하면 이미지 생성 기능을 사용할 수 있습니다.'}
        </div>
      </div>

      <CharacterSheetReferencePanel
        sheets={characterSheets}
        selectedIds={selectedCharacterSheetIds}
        selectedCount={selectedCharacterSheets.length}
        signedIn={isSignedIn}
        loading={sheetLoading}
        uploading={sheetUploading}
        savingSheetId={sheetSavingId}
        info={sheetInfo}
        error={sheetError}
        onRefresh={() => void refreshCharacterSheets()}
        onOpenPicker={() => void handleOpenPicker()}
        onUpload={handleUploadCharacterSheets}
        onToggle={handleToggleCharacterSheet}
        onDescriptionChange={handleCharacterSheetDescriptionChange}
        onDescriptionBlur={handleCharacterSheetDescriptionBlur}
        onDelete={handleDeleteCharacterSheet}
      />

      <CharacterSheetPickerModal
        open={pickerOpen}
        loading={pickerLoading}
        error={pickerError}
        rows={pickerRows}
        selectedIds={pickerSelectedKeys}
        onToggle={handleTogglePickerRow}
        onRefresh={() => void handleRefreshPicker()}
        onImport={handleImportFromPicker}
        onClose={() => setPickerOpen(false)}
      />

      <div className="view-tabs" style={{ marginBottom: 'var(--space-md)' }}>
        {TOOL_TABS.map((tab) => (
          <button
            key={tab.id}
            className={`view-tab ${mode === tab.id ? 'active' : ''}`}
            onClick={() => setMode(tab.id)}
          >
            <span>{tab.icon}</span> {tab.label}
          </button>
        ))}
      </div>

      <div className="card" style={{ marginBottom: 'var(--space-md)', padding: 'var(--space-md)' }}>
        <div className="flex-between" style={{ alignItems: 'center', marginBottom: '8px' }}>
          <div>
            <div className="form-label" style={{ marginBottom: '4px' }}>공용 키 이미지</div>
            <div className="text-muted" style={{ fontSize: '0.75rem' }}>
              각 툴 결과에서 `키 이미지로 보내기`를 누르면 4개 툴 입력에 공통으로 반영됩니다.
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" type="button" onClick={clearSharedKeyImage} disabled={!sharedKeyImage}>
            지우기
          </button>
        </div>
        {sharedKeyImage?.url ? (
          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '10px', alignItems: 'center' }}>
            <img
              src={sharedKeyImage.url}
              alt={sharedKeyImage.label || 'shared-key'}
              style={{ width: '120px', height: '70px', objectFit: 'cover', borderRadius: 'var(--radius-md)' }}
            />
            <div style={{ fontSize: '0.78rem' }}>
              현재 키 이미지: {sharedKeyImage.label || '선택 이미지'}
            </div>
          </div>
        ) : (
          <div className="text-muted" style={{ fontSize: '0.78rem' }}>
            아직 선택된 공용 키 이미지가 없습니다.
          </div>
        )}
      </div>

      {!hasApiKey && (
        <div className="empty-state" style={{ marginBottom: 'var(--space-md)' }}>
          <div className="empty-icon">🔐</div>
          <h3>API 키 필요</h3>
          <p>상단에 Gemini API 키를 입력/저장해야 생성 및 보정이 동작합니다.</p>
        </div>
      )}

      <div style={{ display: mode === 'multi' ? 'block' : 'none' }}>
        <MultiAngleTool
          apiKey={apiKey}
          disabled={!hasApiKey}
          selectedCharacterSheets={selectedCharacterSheets}
          incomingKeyImage={sharedKeyImage}
          onSendToKeyImage={handleSendToKeyImage}
        />
      </div>
      <div style={{ display: mode === 'sheet' ? 'block' : 'none' }}>
        <CharacterSheetTool
          apiKey={apiKey}
          disabled={!hasApiKey}
          selectedCharacterSheets={selectedCharacterSheets}
          incomingKeyImage={sharedKeyImage}
          onSendToKeyImage={handleSendToKeyImage}
        />
      </div>
      <div style={{ display: mode === 'action' ? 'block' : 'none' }}>
        <ActionSceneTool
          apiKey={apiKey}
          disabled={!hasApiKey}
          selectedCharacterSheets={selectedCharacterSheets}
          incomingKeyImage={sharedKeyImage}
          onSendToKeyImage={handleSendToKeyImage}
        />
      </div>
      <div style={{ display: mode === 'tone' ? 'block' : 'none' }}>
        <ToneMannerTool
          apiKey={apiKey}
          disabled={!hasApiKey}
          selectedCharacterSheets={selectedCharacterSheets}
          incomingKeyImage={sharedKeyImage}
          onSendToKeyImage={handleSendToKeyImage}
        />
      </div>
    </div>
  );
}
