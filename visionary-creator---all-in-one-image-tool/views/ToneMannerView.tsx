
import React, { useState } from 'react';
import { applyToneAndManner, fileToBase64 } from '../services/geminiService';
import { AspectRatio } from '../types';

// FIX: App.tsx에서 props를 전달할 수 있도록 인터페이스를 정의합니다.
interface ToneMannerViewProps {
  results: { id: string; url: string }[];
  setResults: (data: { id: string; url: string }[]) => void;
}

const ToneMannerView: React.FC<ToneMannerViewProps> = ({ results, setResults }) => {
  const [styleImage, setStyleImage] = useState<File | null>(null);
  const [stylePreview, setStylePreview] = useState<string | null>(null);
  const [targets, setTargets] = useState<File[]>([]);
  // FIX: 로컬 state 대신 props에서 전달받은 results와 setResults를 사용합니다.
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
  
  const [isDraggingStyle, setIsDraggingStyle] = useState(false);
  const [isDraggingTargets, setIsDraggingTargets] = useState(false);

  const processStyle = (file: File) => {
    setStyleImage(file);
    setStylePreview(URL.createObjectURL(file));
  };

  const processTargets = (files: FileList) => {
    const fileArray = Array.from(files).slice(0, 30);
    setTargets(fileArray);
    setResults([]);
  };

  const resetStyle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setStyleImage(null);
    setStylePreview(null);
  };

  const resetTargets = (e: React.MouseEvent) => {
    e.stopPropagation();
    setTargets([]);
    setResults([]);
  };

  const handleStyleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processStyle(e.target.files[0]);
    }
  };

  const handleTargetsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processTargets(e.target.files);
    }
  };

  const startBatchModify = async () => {
    if (!styleImage || targets.length === 0) return;
    setIsProcessing(true);
    setResults([]);
    setCurrentIndex(0);

    const styleBase64 = await fileToBase64(styleImage);
    const tempResults: { id: string; url: string }[] = [];

    for (let i = 0; i < targets.length; i++) {
      setCurrentIndex(i + 1);
      const targetBase64 = await fileToBase64(targets[i]);
      const resUrl = await applyToneAndManner(targetBase64, styleBase64, targets[i].type, aspectRatio);
      
      if (resUrl) {
        tempResults.push({ id: `mod-${i}`, url: resUrl });
        setResults([...tempResults]);
      }
    }
    setIsProcessing(false);
  };

  const AspectRatioButton = ({ ratio }: { ratio: AspectRatio }) => (
    <button
      onClick={() => setAspectRatio(ratio)}
      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
        aspectRatio === ratio 
          ? 'bg-blue-600 border-blue-500 text-white' 
          : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
      }`}
    >
      {ratio}
    </button>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">톤앤매너 다중 수정 (2K Pro)</h1>
          <p className="text-slate-400">레퍼런스 이미지의 톤을 최대 30장의 이미지에 일괄 적용합니다.</p>
        </div>
        <div className="text-right">
          <span className="text-sm font-mono text-blue-500 px-3 py-1 bg-blue-500/10 rounded-full border border-blue-500/20">
            Batch Engine 2K
          </span>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <div className="glass-panel p-5 rounded-2xl border border-slate-800">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-widest text-blue-400">Style Reference</h3>
              {styleImage && <button onClick={resetStyle} className="text-xs text-slate-500 hover:text-red-400">초기화</button>}
            </div>
            <div 
              className={`h-40 border-2 border-dashed rounded-xl cursor-pointer overflow-hidden flex items-center justify-center transition-all ${
                isDraggingStyle ? 'border-blue-500 bg-blue-500/10' : 'border-slate-700 hover:border-blue-500 bg-slate-900'
              }`}
              onDragOver={(e) => { e.preventDefault(); setIsDraggingStyle(true); }}
              onDragLeave={() => setIsDraggingStyle(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDraggingStyle(false);
                if (e.dataTransfer.files && e.dataTransfer.files[0]) processStyle(e.dataTransfer.files[0]);
              }}
              onClick={() => document.getElementById('style-input')?.click()}
            >
              <input id="style-input" type="file" hidden onChange={handleStyleChange} accept="image/*" />
              {stylePreview ? (
                <img src={stylePreview} className="w-full h-full object-cover" alt="Style Ref" />
              ) : (
                <div className="text-center p-4">
                  <span className="text-3xl mb-2 block">{isDraggingStyle ? '📥' : '🎯'}</span>
                  <span className="text-[10px] text-slate-500 font-medium">{isDraggingStyle ? 'Drop here' : '기준 톤앤매너 드래그'}</span>
                </div>
              )}
            </div>
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-300 mb-2 uppercase tracking-widest">Target Ratio</h3>
              <div className="flex gap-2">
                <AspectRatioButton ratio="1:1" />
                <AspectRatioButton ratio="16:9" />
                <AspectRatioButton ratio="9:16" />
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-widest text-purple-400">Targets (Max 30)</h3>
              {targets.length > 0 && <button onClick={resetTargets} className="text-xs text-slate-500 hover:text-red-400">초기화</button>}
            </div>
            <div 
              className={`h-24 border-2 border-dashed rounded-xl cursor-pointer flex items-center justify-center transition-all ${
                isDraggingTargets ? 'border-purple-500 bg-purple-500/10' : 'border-slate-700 hover:border-purple-500 bg-slate-900'
              }`}
              onDragOver={(e) => { e.preventDefault(); setIsDraggingTargets(true); }}
              onDragLeave={() => setIsDraggingTargets(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDraggingTargets(false);
                if (e.dataTransfer.files) processTargets(e.dataTransfer.files);
              }}
              onClick={() => document.getElementById('targets-input')?.click()}
            >
              <input id="targets-input" type="file" multiple hidden onChange={handleTargetsChange} accept="image/*" />
              <div className="text-center">
                <span className="text-xl block">{isDraggingTargets ? '📥' : '🖼️'}</span>
                <span className="text-[10px] text-slate-500 block">{targets.length > 0 ? `${targets.length}개 선택됨` : '타겟들 드래그(다중)'}</span>
              </div>
            </div>
          </div>

          <button
            onClick={startBatchModify}
            disabled={!styleImage || targets.length === 0 || isProcessing}
            className={`w-full py-4 rounded-xl font-bold transition-all shadow-xl ${
              isProcessing ? 'bg-slate-800 text-slate-600' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/40'
            }`}
          >
            {isProcessing ? `처리 중... (${currentIndex}/${targets.length})` : '대량 일괄 수정 시작'}
          </button>
        </div>

        <div className="lg:col-span-3">
          <div className="glass-panel p-6 rounded-3xl border border-slate-800 min-h-[500px]">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {results.map((res) => (
                <div key={res.id} className={`relative group rounded-lg overflow-hidden border border-slate-700 ${aspectRatio === '16:9' ? 'aspect-video' : aspectRatio === '9:16' ? 'aspect-[9/16]' : 'aspect-square'}`}>
                  <img src={res.url} className="w-full h-full object-cover" alt="Processed" />
                  <div className="absolute inset-0 bg-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <button 
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = res.url; link.download = `toned_${res.id}.png`;
                      document.body.appendChild(link); link.click(); document.body.removeChild(link);
                    }}
                    className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    📥
                  </button>
                </div>
              ))}
              {Array.from({ length: Math.max(0, targets.length - results.length) }).map((_, i) => (
                <div key={`placeholder-${i}`} className={`bg-slate-900/50 border border-slate-800 rounded-lg flex items-center justify-center border-dashed ${aspectRatio === '16:9' ? 'aspect-video' : aspectRatio === '9:16' ? 'aspect-[9/16]' : 'aspect-square'}`}>
                  {isProcessing && i === 0 ? (
                     <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span className="text-slate-800 text-2xl font-bold">{results.length + i + 1}</span>
                  )}
                </div>
              ))}
              {targets.length === 0 && (
                <div className="col-span-full h-96 flex flex-col items-center justify-center text-slate-700">
                   <span className="text-6xl mb-4">🎨</span>
                   <p className="font-medium text-sm">레퍼런스와 타겟 이미지를 드래그하여 업로드하세요.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ToneMannerView;
