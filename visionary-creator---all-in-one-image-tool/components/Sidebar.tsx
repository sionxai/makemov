
import React from 'react';
import { ToolMode } from '../types';

interface SidebarProps {
  currentMode: ToolMode;
  setMode: (mode: ToolMode) => void;
  onClearAll: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentMode, setMode, onClearAll }) => {
  const menuItems = [
    { id: ToolMode.MULTI_ANGLE, label: '다양한 화각 생성', icon: '🎥' },
    { id: ToolMode.CHARACTER_SHEET, label: '양식 포맷 동일 생성', icon: '👤' },
    { id: ToolMode.ACTION_SCENE, label: '액션 시퀀스 생성', icon: '🔥' },
    { id: ToolMode.TONE_MANNER, label: '톤앤매너 다중 수정', icon: '🎨' },
  ];

  return (
    <div className="w-64 glass-panel h-screen fixed left-0 top-0 p-6 flex flex-col gap-8">
      <div className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
        VISIONARY PRO
      </div>
      
      <nav className="flex flex-col gap-2">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setMode(item.id)}
            className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
              currentMode === item.id 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
                : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            <span className="text-xl">{item.icon}</span>
            <span className="font-medium">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="mt-auto space-y-4">
        <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700 text-xs text-slate-400 leading-relaxed">
          <p className="font-semibold text-blue-400 mb-1">Persistent Storage</p>
          <p>생성된 이미지는 브라우저에 자동 저장되어 다음에 다시 볼 수 있습니다.</p>
        </div>
        
        <button 
          onClick={onClearAll}
          className="w-full py-3 bg-red-900/20 hover:bg-red-900/40 text-red-400 text-xs font-bold rounded-xl border border-red-900/30 transition-all flex items-center justify-center gap-2"
        >
          🗑️ 저장소 초기화
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
