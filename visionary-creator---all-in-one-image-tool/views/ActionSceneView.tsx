
import React, { useState } from 'react';
import { fileToBase64, generateImageWithReference } from '../services/geminiService';
import { AspectRatio } from '../types';

interface ActionSceneViewProps {
  results: { id: string; url: string; step: number; label: string }[];
  setResults: (data: { id: string; url: string; step: number; label: string }[]) => void;
}

const ActionSceneView: React.FC<ActionSceneViewProps> = ({ results, setResults }) => {
  const [keyImage, setKeyImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [additionalPrompt, setAdditionalPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('9:16');
  const [isDragging, setIsDragging] = useState(false);

  const [selectedImage, setSelectedImage] = useState<{ id: string; url: string; step: number; label: string } | null>(null);
  const [refinePrompt, setRefinePrompt] = useState('');
  const [isRefining, setIsRefining] = useState(false);

  const processFile = (file: File) => {
    setKeyImage(file);
    setPreview(URL.createObjectURL(file));
    setResults([]);
  };

  const resetAction = (e: React.MouseEvent) => {
    e.stopPropagation();
    setKeyImage(null);
    setPreview(null);
    setResults([]);
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const startActionGen = async () => {
    if (!keyImage) return;
    setIsGenerating(true);
    setResults([]);

    const base64 = await fileToBase64(keyImage);
    const steps = [
      "준비 동작", "도약", "공중 회전", "타격 시작", "임팩트",
      "공간 파괴", "반동", "착지 준비", "착지 및 먼지", "피니시"
    ];

    for (let i = 0; i < steps.length; i++) {
      const prompt = `Based on this key frame, generate action step ${i+1}: ${steps[i]}. 
      Style info: ${additionalPrompt}. 
      Ensure dynamic motion blur, speed lines. Output ratio: ${aspectRatio}.`;
      
      const url = await generateImageWithReference(prompt, base64, keyImage.type, aspectRatio);
      if (url) {
        setResults([...results, { id: `act-${i}-${Date.now()}`, url, step: i + 1, label: steps[i] }]);
      }
    }
    setIsGenerating(false);
  };

  const handleRefine = async () => {
    if (!selectedImage || !refinePrompt) return;
    setIsRefining(true);
    
    // 현재 선택된 액션 프레임의 Base64 추출
    const currentFrameBase64 = selectedImage.url.split(',')[1];
    
    // 현재 프레임을 레퍼런스로 사용
    const prompt = `Refine this action frame based on this request: "${refinePrompt}". 
    Maintain the current character pose, energy, and background, but apply the changes to this current frame. 
    Ratio: ${aspectRatio}.`;

    try {
      const url = await generateImageWithReference(prompt, currentFrameBase64, 'image/png', aspectRatio);
      if (url) {
        setResults(results.map(r => r.id === selectedImage.id ? { ...r, url } : r));
        setSelectedImage({ ...selectedImage, url });
        setRefinePrompt('');
      }
    } catch (e) { 
      console.error(e);
      alert("수정 실패"); 
    } finally { 
      setIsRefining(false); 
    }
  };

  const downloadImage = (url: string, filename: string) => {
    const link = document.createElement('a'); link.href = url; link.download = filename;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const AspectRatioButton = ({ ratio }: { ratio: AspectRatio; key?: React.Key }) => (
    <button
      onClick={() => setAspectRatio(ratio)}
      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${
        aspectRatio === ratio 
          ? 'bg-orange-600 border-orange-500 text-white shadow-lg shadow-orange-900/40' 
          : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
      }`}
    >
      {ratio}
    </button>
  );

  const getAspectClass = (ratio: AspectRatio) => {
    switch (ratio) {
      case '16:9': return 'aspect-video';
      case '9:16': return 'aspect-[9/16]';
      case '4:3': return 'aspect-[4/3]';
      case '3:4': return 'aspect-[3/4]';
      default: return 'aspect-square';
    }
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-right-4 duration-500 pb-20">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">액션 시퀀스 생성 (2K Pro)</h1>
          <p className="text-slate-400">하나의 키 프레임을 기준으로 10단계의 화려한 액션 시퀀스를 구성합니다.</p>
        </div>
        {results.length > 0 && (
          <button onClick={() => results.forEach((r, i) => downloadImage(r.url, `action_${i}.png`))} className="px-6 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg transition-colors">전체 다운로드</button>
        )}
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1 glass-panel p-6 rounded-3xl border border-slate-800 space-y-6 shadow-2xl">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-semibold text-orange-400 uppercase tracking-widest">시작 프레임 업로드</h3>
              {keyImage && <button onClick={resetAction} className="text-xs text-slate-500 hover:text-red-400">초기화</button>}
            </div>
            <div 
              className={`relative h-64 w-full rounded-2xl border-2 border-dashed overflow-hidden cursor-pointer transition-all flex items-center justify-center ${
                isDragging ? 'border-orange-500 bg-orange-500/10' : 'border-slate-700 hover:border-orange-500 bg-slate-900'
              }`}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                if (e.dataTransfer.files && e.dataTransfer.files[0]) processFile(e.dataTransfer.files[0]);
              }}
              onClick={() => document.getElementById('action-upload')?.click()}
            >
              <input id="action-upload" type="file" hidden onChange={handleUpload} accept="image/*" />
              {preview ? (
                <img src={preview} className="w-full h-full object-cover" />
              ) : (
                <div className="text-center text-slate-500 flex flex-col items-center">
                  <span className="text-4xl mb-2">{isDragging ? '📥' : '🎬'}</span>
                  <span className="text-xs uppercase">{isDragging ? 'Drop here' : 'Click or Drag Frame'}</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="space-y-5">
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-tight">출력 화면 비율</h3>
              <div className="flex flex-wrap gap-1.5">
                {(['1:1', '16:9', '9:16', '4:3', '3:4'] as AspectRatio[]).map(r => (
                  <AspectRatioButton key={r} ratio={r} />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-tight">액션 연출 옵션</h3>
              <textarea value={additionalPrompt} onChange={(e) => setAdditionalPrompt(e.target.value)} placeholder="번개 이펙트, 폭발 배경 등 연출 세부 사항..." className="w-full h-24 bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-slate-400 outline-none focus:border-orange-500 transition-colors resize-none" />
            </div>
          </div>

          <button onClick={startActionGen} disabled={!keyImage || isGenerating} className="w-full py-4 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl shadow-xl shadow-orange-900/30 transition-all">
            {isGenerating ? '시퀀스 렌더링 중...' : '10개 동작 일괄 생성'}
          </button>
        </div>

        <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-5 gap-4">
           {results.map((res) => (
             <div key={res.id} onClick={() => setSelectedImage(res)} className={`group relative glass-panel rounded-xl overflow-hidden border border-slate-800 animate-in zoom-in-95 cursor-pointer hover:border-orange-500 transition-all ${getAspectClass(aspectRatio)}`}>
                <img src={res.url} className="w-full h-full object-cover" alt={`Action ${res.step}`} />
                <div className="absolute top-2 left-2 bg-orange-600 text-[9px] px-1.5 py-0.5 rounded font-bold shadow-lg">STEP {res.step}</div>
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="text-white text-xs font-bold border border-white/40 px-3 py-1 rounded-full backdrop-blur-sm">🔍 자세히 보기</span>
                </div>
             </div>
           ))}
           {isGenerating && results.length < 10 && (
             <div className={`bg-slate-900 border border-slate-800 rounded-xl flex flex-col items-center justify-center animate-pulse ${getAspectClass(aspectRatio)}`}>
                <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mb-2" />
                <span className="text-slate-700 text-[10px] font-mono">RENDERING...</span>
             </div>
           )}
        </div>
      </div>

      {selectedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 animate-in fade-in duration-200">
          <div className="relative max-w-5xl w-full grid grid-cols-1 md:grid-cols-2 bg-slate-900 rounded-3xl overflow-hidden border border-slate-800 shadow-2xl">
            <button onClick={() => setSelectedImage(null)} className="absolute top-4 right-4 z-10 text-white bg-black/40 w-8 h-8 rounded-full">✕</button>
            <div className="bg-black p-4 flex items-center justify-center"><img src={selectedImage.url} className="max-w-full max-h-[70vh] object-contain" /></div>
            <div className="p-8 space-y-6 flex flex-col">
              <div>
                <span className="text-orange-500 font-bold text-xs">ACTION SEQUENCE STEP {selectedImage.step}</span>
                <h2 className="text-2xl font-bold mt-1 uppercase">{selectedImage.label}</h2>
              </div>
              <textarea value={refinePrompt} onChange={(e) => setRefinePrompt(e.target.value)} placeholder="현재 프레임에서 수정할 사항 (예: 불꽃 효과를 더 화려하게)..." className="flex-grow bg-slate-800 border border-slate-700 rounded-xl p-4 text-sm text-slate-200 outline-none focus:border-orange-500 transition-colors" />
              <div className="pt-4 space-y-3">
                <button onClick={handleRefine} disabled={isRefining || !refinePrompt} className="w-full py-3 bg-orange-600 text-white rounded-xl font-bold shadow-lg shadow-orange-900/40">{isRefining ? '수정 중...' : '현재 이미지 기반 수정'}</button>
                <button onClick={() => downloadImage(selectedImage.url, `action_step_${selectedImage.step}.png`)} className="w-full py-3 bg-white text-black rounded-xl font-bold hover:bg-slate-200 transition-colors">이미지 저장</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActionSceneView;
