import { useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { CopyBlock, CopyBlockCode } from '../components/CopyBlock';
import { synopsisToMarkdown } from '../data/jinju-seed';

const ACT_ICONS = ['🌅', '⚔️', '🔥', '🌸'];
const ACT_COLORS = ['#d4a574', '#c0392b', '#e74c3c', '#9b59b6'];

function ViewTabs({ view, setView }) {
    const tabs = [
        { key: 'design', label: '디자인', icon: '🎨' },
        { key: 'md', label: 'MD', icon: '📄' },
        { key: 'json', label: 'JSON', icon: '{ }' },
    ];
    return (
        <div className="view-tabs">
            {tabs.map(t => (
                <button
                    key={t.key}
                    className={`view-tab ${view === t.key ? 'active' : ''}`}
                    onClick={() => setView(t.key)}
                >
                    <span className="view-tab-icon">{t.icon}</span>
                    {t.label}
                </button>
            ))}
        </div>
    );
}

function InfoGrid({ info }) {
    const items = [
        { label: '장르', value: info.genre, icon: '🎭' },
        { label: '러닝타임', value: info.runtime, icon: '⏱' },
        { label: '톤 & 무드', value: info.tone, icon: '🎨' },
        { label: '오디언스', value: info.audience, icon: '👥' },
        { label: '형식', value: info.format, icon: '📽' },
    ];
    return (
        <div className="syn-info-grid">
            {items.map(item => (
                <div key={item.label} className="syn-info-item">
                    <span className="syn-info-icon">{item.icon}</span>
                    <div>
                        <div className="syn-info-label">{item.label}</div>
                        <div className="syn-info-value">{item.value}</div>
                    </div>
                </div>
            ))}
        </div>
    );
}

function ActCard({ act, index }) {
    return (
        <div className="syn-act-card" style={{ '--act-color': ACT_COLORS[index] || ACT_COLORS[0] }}>
            <div className="syn-act-header">
                <span className="syn-act-icon">{ACT_ICONS[index] || '📌'}</span>
                <div>
                    <div className="syn-act-title">{act.title}</div>
                    <div className="syn-act-subtitle">{act.subtitle}</div>
                </div>
            </div>
            <div className="syn-act-content">
                {act.content.split('\n\n').map((para, i) => (
                    <p key={i}>{para}</p>
                ))}
            </div>
            <CopyBlock content={act.content} id={`act-${index}`} />
        </div>
    );
}

function CharacterCard({ char }) {
    return (
        <div className="syn-char-card">
            <div className="syn-char-header">
                <div className="syn-char-avatar">
                    {char.name.charAt(0)}
                </div>
                <div>
                    <div className="syn-char-name">
                        {char.name}
                        {char.nameHanja && <span className="syn-char-hanja">{char.nameHanja}</span>}
                    </div>
                    <div className="syn-char-role">
                        {char.role}{char.age && ` · ${char.age}`}
                    </div>
                </div>
            </div>
            <div className="syn-char-details">
                <div className="syn-char-row"><span className="syn-char-label">외형</span>{char.appearance}</div>
                <div className="syn-char-row"><span className="syn-char-label">성격</span>{char.personality}</div>
                <div className="syn-char-row"><span className="syn-char-label">동기</span>{char.motivation}</div>
                <div className="syn-char-row"><span className="syn-char-label">아크</span><strong>{char.arc}</strong></div>
            </div>
        </div>
    );
}

function DesignView({ data }) {
    if (!data) return null;
    return (
        <div className="syn-design">
            {/* 헤더 */}
            <div className="syn-hero">
                <h2 className="syn-hero-title">{data.title}</h2>
                {data.titleEn && <div className="syn-hero-subtitle">{data.titleEn}</div>}
            </div>

            {/* 기본 정보 */}
            <div className="syn-section">
                <div className="syn-section-header">
                    <span>📋</span> 기본 정보
                </div>
                <InfoGrid info={data.info} />
            </div>

            {/* 로그라인 */}
            <div className="syn-section syn-logline">
                <div className="syn-section-header">
                    <span>🎯</span> 로그라인
                </div>
                <blockquote className="syn-quote">{data.logline}</blockquote>
                <CopyBlock content={data.logline} id="logline" />
            </div>

            {/* 테마 */}
            <div className="syn-section syn-theme">
                <div className="syn-section-header">
                    <span>💎</span> 테마
                </div>
                <blockquote className="syn-quote syn-quote-theme">{data.theme}</blockquote>
                <CopyBlock content={data.theme} id="theme" />
            </div>

            {/* 시놉시스 본문 — 막별 카드 */}
            <div className="syn-section">
                <div className="syn-section-header">
                    <span>📖</span> 시놉시스 본문
                </div>
                <div className="syn-acts">
                    {data.acts.map((act, i) => (
                        <ActCard key={i} act={act} index={i} />
                    ))}
                </div>
            </div>

            {/* 주요 인물 */}
            <div className="syn-section">
                <div className="syn-section-header">
                    <span>👤</span> 주요 인물
                </div>
                <div className="syn-chars">
                    {data.characters.map((ch, i) => (
                        <CharacterCard key={i} char={ch} />
                    ))}
                </div>
            </div>

            {/* 비주얼 톤 */}
            <div className="syn-section">
                <div className="syn-section-header">
                    <span>🎨</span> 비주얼 톤 & 미장센
                </div>
                <div className="syn-visual-grid">
                    {[
                        { icon: '🎨', label: '색감/팔레트', value: data.visualTone.palette },
                        { icon: '💡', label: '조명', value: data.visualTone.lighting },
                        { icon: '📷', label: '카메라', value: data.visualTone.camera },
                        { icon: '🎬', label: '레퍼런스', value: data.visualTone.references },
                    ].map(item => (
                        <div key={item.label} className="syn-visual-item">
                            <div className="syn-visual-label">{item.icon} {item.label}</div>
                            <div className="syn-visual-value">{item.value}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* 사운드 */}
            <div className="syn-section">
                <div className="syn-section-header">
                    <span>🔊</span> 사운드 & 음악 방향
                </div>
                <div className="syn-visual-grid">
                    {[
                        { icon: '🎵', label: 'BGM', value: data.sound.bgm },
                        { icon: '🔊', label: '효과음', value: data.sound.sfx },
                        { icon: '🎙', label: '내레이션', value: data.sound.narration },
                    ].map(item => (
                        <div key={item.label} className="syn-visual-item">
                            <div className="syn-visual-label">{item.icon} {item.label}</div>
                            <div className="syn-visual-value">{item.value}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* 핵심 장면 */}
            <div className="syn-section">
                <div className="syn-section-header">
                    <span>🎬</span> 핵심 장면 리스트
                </div>
                <div className="syn-scenes">
                    {data.keyScenes.map((scene, i) => (
                        <div key={i} className="syn-scene-item">
                            <span className="syn-scene-num">{i + 1}</span>
                            <div>
                                <div className="syn-scene-title">{scene.title}</div>
                                <div className="syn-scene-desc">{scene.description}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default function SynopsisPage() {
    const { project } = useOutletContext();
    const [view, setView] = useState('design');

    // structured data
    const data = project?.synopsis?.structured || null;

    // 파생 데이터
    const mdText = useMemo(() => data ? synopsisToMarkdown(data) : (project?.synopsis?.content || ''), [data, project]);
    const jsonText = useMemo(() => data ? JSON.stringify(data, null, 2) : '{}', [data]);

    return (
        <div className="section" style={{ animation: 'fadeIn 300ms ease' }}>
            <div className="flex-between mb-lg">
                <div className="section-title">
                    <span className="section-icon">📄</span>
                    시놉시스
                </div>
                <div className="flex gap-sm" style={{ alignItems: 'center' }}>
                    <ViewTabs view={view} setView={setView} />
                </div>
            </div>

            {/* 디자인 뷰 (기본) */}
            {view === 'design' && <DesignView data={data} />}

            {/* MD 뷰 */}
            {view === 'md' && (
                <CopyBlock
                    label="시놉시스 (Markdown)"
                    content={mdText}
                    id="synopsis-md"
                />
            )}

            {/* JSON 뷰 */}
            {view === 'json' && (
                <CopyBlockCode
                    label="시놉시스 (JSON)"
                    content={jsonText}
                    id="synopsis-json"
                />
            )}

            {project?.synopsis?.updatedAt && (
                <div className="text-muted mt-md" style={{ fontSize: '0.75rem' }}>
                    마지막 수정: {new Date(project.synopsis.updatedAt).toLocaleString('ko-KR')}
                </div>
            )}
        </div>
    );
}
