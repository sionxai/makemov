
import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import MultiAngleView from './views/MultiAngleView';
import CharacterSheetView from './views/CharacterSheetView';
import ActionSceneView from './views/ActionSceneView';
import ToneMannerView from './views/ToneMannerView';
import { ToolMode } from './types';
import { saveData, loadData, clearAllData } from './services/dbService';

declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
  interface Window {
    // FIX: All declarations of 'aistudio' must have identical modifiers 에러 해결을 위해 readonly 제거
    aistudio: AIStudio;
  }
}

const App: React.FC = () => {
  const [currentMode, setCurrentMode] = useState<ToolMode>(ToolMode.MULTI_ANGLE);
  const [hasKey, setHasKey] = useState<boolean | null>(null);

  // 각 뷰의 결과 상태를 전역적으로 관리
  const [multiAngleResults, setMultiAngleResults] = useState<any[]>([]);
  const [characterSheetResults, setCharacterSheetResults] = useState<any[]>([]);
  const [actionSceneResults, setActionSceneResults] = useState<any[]>([]);
  const [toneMannerResults, setToneMannerResults] = useState<any[]>([]);

  useEffect(() => {
    checkApiKey();
    loadAllStoredData();
  }, []);

  const checkApiKey = async () => {
    const selected = await window.aistudio.hasSelectedApiKey();
    setHasKey(selected);
  };

  const loadAllStoredData = async () => {
    try {
      const ma = await loadData('multiAngle');
      if (ma) setMultiAngleResults(ma);
      const cs = await loadData('characterSheet');
      if (cs) setCharacterSheetResults(cs);
      const as = await loadData('actionScene');
      if (as) setActionSceneResults(as);
      const tm = await loadData('toneManner');
      if (tm) setToneMannerResults(tm);
    } catch (e) {
      console.error("Failed to load stored data", e);
    }
  };

  const handleOpenKeyDialog = async () => {
    await window.aistudio.openSelectKey();
    // 가이드라인에 따라 race condition 방지를 위해 즉시 true로 설정하여 앱으로 진입
    setHasKey(true);
  };

  const handleClearAll = async () => {
    if (window.confirm("생성된 모든 이미지를 브라우저 저장소에서 삭제하시겠습니까?")) {
      await clearAllData();
      setMultiAngleResults([]);
      setCharacterSheetResults([]);
      setActionSceneResults([]);
      setToneMannerResults([]);
      alert("초기화되었습니다.");
    }
  };

  // 결과 업데이트 및 자동 저장 래퍼
  const updateMultiAngle = (data: any[]) => {
    setMultiAngleResults(data);
    saveData('multiAngle', data);
  };
  const updateCharacterSheet = (data: any[]) => {
    setCharacterSheetResults(data);
    saveData('characterSheet', data);
  };
  const updateActionScene = (data: any[]) => {
    setActionSceneResults(data);
    saveData('actionScene', data);
  };
  const updateToneManner = (data: any[]) => {
    setToneMannerResults(data);
    saveData('toneManner', data);
  };

  if (hasKey === null) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Loading...</div>;

  if (!hasKey) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md space-y-8 glass-panel p-10 rounded-3xl border border-slate-800 shadow-2xl">
          <div className="text-5xl">💎</div>
          <h1 className="text-3xl font-bold text-white">Pro 엔진 활성화</h1>
          <div className="text-slate-400 leading-relaxed space-y-4">
            <p>
              고해상도(2K) 이미지 생성을 위해 유료 프로젝트의 API 키 선택이 필요합니다.
            </p>
            {/* 가이드라인 준수: 빌링 관련 문서 링크 제공 */}
            <p className="text-xs text-slate-500">
              빌링 정보: <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">ai.google.dev/gemini-api/docs/billing</a>
            </p>
          </div>
          <div className="pt-4 space-y-4">
            <button
              onClick={handleOpenKeyDialog}
              className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-900/40"
            >
              유료 API 키 선택하기
            </button>
          </div>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (currentMode) {
      case ToolMode.MULTI_ANGLE:
        return <MultiAngleView results={multiAngleResults} setResults={updateMultiAngle} />;
      case ToolMode.CHARACTER_SHEET:
        return <CharacterSheetView results={characterSheetResults} setResults={updateCharacterSheet} />;
      case ToolMode.ACTION_SCENE:
        return <ActionSceneView results={actionSceneResults} setResults={updateActionScene} />;
      case ToolMode.TONE_MANNER:
        return <ToneMannerView results={toneMannerResults} setResults={updateToneManner} />;
      default:
        return <MultiAngleView results={multiAngleResults} setResults={updateMultiAngle} />;
    }
  };

  return (
    <div className="min-h-screen pl-64 bg-slate-950">
      <Sidebar currentMode={currentMode} setMode={setCurrentMode} onClearAll={handleClearAll} />
      <main className="p-8 max-w-7xl mx-auto">
        {renderContent()}
      </main>
    </div>
  );
};

export default App;
