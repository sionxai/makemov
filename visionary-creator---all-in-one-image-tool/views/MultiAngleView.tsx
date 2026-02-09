
import React, { useState } from 'react';
import { CINEMATIC_ANGLES, GeneratedImage, AspectRatio } from '../types';
import { fileToBase64, generateImageWithReference } from '../services/geminiService';

interface MultiAngleViewProps {
  results: GeneratedImage[];
  setResults: (data: GeneratedImage[]) => void;
}

const MultiAngleView: React.FC<MultiAngleViewProps> = ({ results, setResults }) => {
  const [keyImage, setKeyImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [additionalPrompt, setAdditionalPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
  const [isDragging, setIsDragging] = useState(false);
  
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);
  const [refinePrompt, setRefinePrompt] = useState('');
  const [isRefining, setIsRefining] = useState(false);

  const processFile = (file: File) => {
    setKeyImage(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const resetImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setKeyImage(null);
    setPreviewUrl(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const startGeneration = async () => {
    if (!keyImage) return;

    setIsGenerating(true);
    setResults([]);
    setProgress(0);

    const base64 = await fileToBase64(keyImage);
    const newResults: GeneratedImage[] = [];

    for (let i = 0; i < CINEMATIC_ANGLES.length; i++) {
      const angle = CINEMATIC_ANGLES[i];
      const prompt = `Based on this key image, generate a new image with the following cinematic angle: ${angle.name}. ${angle.description}. Requirements: ${additionalPrompt}. Maintain strict character/environmental consistency. Ratio: ${aspectRatio}.`;
      
      try {
        const imageUrl = await generateImageWithReference(prompt, base64, keyImage.type, aspectRatio);
        if (imageUrl) {
          const newImg = { id: `angle-${i}-${Date.now()}`, url: imageUrl, label: angle.name };
          newResults.push(newImg);
          setResults([...newResults]);
        }
      } catch (err) { console.error(err); }
      setProgress(Math.round(((i + 1) / CINEMATIC_ANGLES.length) * 100));
    }
    setIsGenerating(false);
  };

  const handleRefine = async () => {
    if (!selectedImage || !refinePrompt) return;
    setIsRefining(true);
    
    // 현재 선택된 결과물 이미지에서 Base64 데이터 추출
    const currentImageBase64 = selectedImage.url.split(',')[1];
    
    // 현재 이미지를 기준으로 수정하도록 프롬프트 구성
    const prompt = `Modify this specific image based on this request: "${refinePrompt}". 
    Important: Keep the current composition, character appearance, and style as much as possible, only applying the requested changes.
    Output ratio: ${aspectRatio}.`;

    try {
      const newUrl = await generateImageWithReference(prompt, currentImageBase64, 'image/png', aspectRatio);
      if (newUrl) {
        const updatedResults = results.map(img => img.id === selectedImage.id ? { ...img, url: newUrl } : img);
        setResults(updatedResults);
        setSelectedImage({ ...selectedImage, url: newUrl });
        setRefinePrompt('');
      }
    } catch (err) { 
      console.error(err);
      alert("이미지 수정 중 오류가 발생했습니다."); 
    } finally { 
      setIsRefining(false); 
    }
  };

  const downloadImage = (url: string, filename: string) => {
    const link = document.createElement('a'); link.href = url; link.download = filename;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <header className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">영화적 화각 생성 (2K Pro)</h1>
          <p className="text-slate-400">하나의 키 이미지를 기반으로 15개의 영화적 구도를 일괄 생성합니다.</p>
        </div>
        {results.length > 0 && (
          <button onClick={() => results.forEach((img, i) => downloadImage(img.url, `${img.label}.png`))} className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg border border-slate-700 transition-colors flex items-center gap-2">📥 전체 다운로드</button>
        )}
      </header>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-4">
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-blue-400">Step 1. 키 이미지 업로드</h3>
              {keyImage && <button onClick={resetImage} className="text-xs text-slate-500 hover:text-red-400">초기화</button>}
            </div>
            <div 
              className={`relative border-2 border-dashed rounded-xl transition-all h-64 flex items-center justify-center cursor-pointer ${isDragging ? 'border-blue-500 bg-blue-500/10' : 'border-slate-700 hover:border-blue-500'}`}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files[0]) processFile(e.dataTransfer.files[0]); }}
              onClick={() => document.getElementById('key-input')?.click()}
            >
              <input id="key-input" type="file" hidden onChange={handleFileChange} accept="image/*" />
              {previewUrl ? <img src={previewUrl} className="w-full h-full object-cover rounded-xl" /> : <div className="text-slate-500">📸 클릭/드래그</div>}
            </div>

            <div className="mt-6 space-y-4">
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-purple-400 uppercase">Step 2. 화면 비율</h3>
                <div className="flex flex-wrap gap-2">
                  {['1:1', '16:9', '9:16', '4:3', '3:4'].map(r => (
                    <button key={r} onClick={() => setAspectRatio(r as AspectRatio)} className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${aspectRatio === r ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'}`}>{r}</button>
                  ))}
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-purple-400 uppercase">Step 3. 추가 스타일</h3>
                <textarea value={additionalPrompt} onChange={(e) => setAdditionalPrompt(e.target.value)} placeholder="예: 사이버펑크 스타일 등..." className="w-full h-24 bg-slate-900 border border-slate-700 rounded-xl p-4 text-sm text-slate-300 outline-none" />
              </div>

              <button onClick={startGeneration} disabled={!keyImage || isGenerating} className={`w-full py-4 rounded-xl font-bold ${!keyImage || isGenerating ? 'bg-slate-800 text-slate-500' : 'bg-blue-600 text-white shadow-xl shadow-blue-900/30'}`}>
                {isGenerating ? `생성 중... (${progress}%)` : '15개 화각 일괄 생성'}
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          {isGenerating && <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mb-6"><div className="bg-blue-500 h-full transition-all duration-300" style={{ width: `${progress}%` }} /></div>}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {results.map((img) => (
              <div key={img.id} className={`group relative glass-panel rounded-xl overflow-hidden border border-slate-800 cursor-zoom-in aspect-video`} onClick={() => setSelectedImage(img)}>
                <img src={img.url} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">🔍</div>
              </div>
            ))}
            {results.length === 0 && <div className="col-span-full py-32 text-center text-slate-700 border-2 border-dashed border-slate-800 rounded-3xl">이미지를 업로드하고 생성을 시작하세요.</div>}
          </div>
        </div>
      </section>

      {selectedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 animate-in fade-in duration-200">
          <div className="relative max-w-6xl w-full grid grid-cols-1 lg:grid-cols-3 bg-slate-900 rounded-3xl overflow-hidden border border-slate-800 shadow-2xl">
            <button onClick={() => setSelectedImage(null)} className="absolute top-4 right-4 z-10 w-10 h-10 bg-black/50 text-white rounded-full">✕</button>
            <div className="lg:col-span-2 bg-black flex items-center justify-center min-h-[400px]"><img src={selectedImage.url} className="max-w-full max-h-[80vh] object-contain" /></div>
            <div className="p-8 flex flex-col h-full border-l border-slate-800 space-y-6">
              <h2 className="text-2xl font-bold text-white uppercase tracking-tight">{selectedImage.label}</h2>
              <textarea value={refinePrompt} onChange={(e) => setRefinePrompt(e.target.value)} placeholder="현재 이미지에서 변경할 내용을 입력하세요 (예: 배경을 밤으로 바꿔줘)..." className="flex-grow bg-slate-800 border border-slate-700 rounded-xl p-4 text-sm text-slate-200 outline-none" />
              <button onClick={handleRefine} disabled={isRefining || !refinePrompt} className="w-full py-3 bg-purple-600 text-white rounded-xl font-bold">{isRefining ? '수정 생성 중...' : '현재 이미지 기반 수정'}</button>
              <button onClick={() => downloadImage(selectedImage.url, `${selectedImage.label}_final.png`)} className="w-full py-3 bg-white text-black font-bold rounded-xl">이미지 저장</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiAngleView;
