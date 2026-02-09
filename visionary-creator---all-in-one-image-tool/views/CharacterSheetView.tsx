
import React, { useState } from 'react';
import { fileToBase64, generateImageWithMultipleReferences, generateImageWithReference } from '../services/geminiService';
import { AspectRatio } from '../types';

interface CharacterSheetViewProps {
  results: { id: string; url: string; label: string }[];
  setResults: (data: { id: string; url: string; label: string }[]) => void;
}

const CharacterSheetView: React.FC<CharacterSheetViewProps> = ({ results, setResults }) => {
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [templatePreview, setTemplatePreview] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [additionalPrompt, setAdditionalPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
  
  const [isDraggingTemplate, setIsDraggingTemplate] = useState(false);
  const [isDraggingSubjects, setIsDraggingSubjects] = useState(false);

  const [selectedImage, setSelectedImage] = useState<{ id: string; url: string; label: string } | null>(null);
  const [refinePrompt, setRefinePrompt] = useState('');
  const [isRefining, setIsRefining] = useState(false);

  const processTemplate = (file: File) => {
    setTemplateFile(file);
    setTemplatePreview(URL.createObjectURL(file));
  };

  const processSubjects = (files: FileList) => {
    setSubjects(Array.from(files));
  };

  const handleTemplateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processTemplate(e.target.files[0]);
    }
  };

  const handleSubjectsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processSubjects(e.target.files);
    }
  };

  const resetTemplate = (e: React.MouseEvent) => {
    e.stopPropagation();
    setTemplateFile(null);
    setTemplatePreview(null);
  };

  const resetSubjects = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSubjects([]);
    setResults([]);
  };

  const startProcessing = async () => {
    if (!templateFile || subjects.length === 0) return;

    setIsProcessing(true);
    setResults([]);

    const templateBase64 = await fileToBase64(templateFile);
    const newResults: { id: string; url: string; label: string }[] = [];

    for (let i = 0; i < subjects.length; i++) {
      const subjectBase64 = await fileToBase64(subjects[i]);
      
      const prompt = `Task: Character Sheet Redraw.
      1. First image is the 'Layout Template'. Strictly follow its composition, panel arrangement, and white background style.
      2. Second image is the 'Subject Character'. Extract facial features, hair style, and body type from this character.
      3. Result: Redraw the 'Subject Character' inside the exact layout of the 'Layout Template'.
      Additional details: ${additionalPrompt}. 
      Ensure total character consistency across all panels. Output ratio: ${aspectRatio}.`;
      
      const imageUrl = await generateImageWithMultipleReferences(
        prompt, 
        [
          { data: templateBase64, mimeType: templateFile.type },
          { data: subjectBase64, mimeType: subjects[i].type }
        ],
        aspectRatio
      );

      if (imageUrl) {
        const item = { id: `sheet-${i}-${Date.now()}`, url: imageUrl, label: `변환 결과 ${i+1}` };
        newResults.push(item);
        setResults([...newResults]);
      }
    }

    setIsProcessing(false);
  };

  const handleRefine = async () => {
    if (!selectedImage || !refinePrompt) return;
    setIsRefining(true);
    
    // 현재 선택된 결과 이미지의 Base64 데이터 추출
    const currentImageBase64 = selectedImage.url.split(',')[1];
    
    // 현재 이미지를 유일한 레퍼런스로 사용하여 수정 지시
    const prompt = `Refine this character sheet result based on the user's request: "${refinePrompt}". 
    Maintain the current character design and panel layout, but apply the requested modifications to the current image. 
    Ratio: ${aspectRatio}.`;

    try {
      const newUrl = await generateImageWithReference(
        prompt,
        currentImageBase64,
        'image/png',
        aspectRatio
      );
      if (newUrl) {
        setResults(results.map(r => r.id === selectedImage.id ? { ...r, url: newUrl } : r));
        setSelectedImage({ ...selectedImage, url: newUrl });
        setRefinePrompt('');
      }
    } catch (err) { 
      console.error(err);
      alert("오류 발생"); 
    } finally { 
      setIsRefining(false); 
    }
  };

  const downloadImage = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url; link.download = filename;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const AspectRatioButton = ({ ratio }: { ratio: AspectRatio; key?: React.Key }) => (
    <button
      onClick={() => setAspectRatio(ratio)}
      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${
        aspectRatio === ratio 
          ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/20' 
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
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500 pb-20">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">양식 포맷 동일 생성 (2K Pro)</h1>
          <p className="text-slate-400">기준 양식의 구도에 맞춰 여러 인물을 일괄 변환합니다.</p>
        </div>
        {results.length > 0 && (
          <button onClick={() => results.forEach((r, i) => downloadImage(r.url, `sheet_${i}.png`))} className="px-6 py-2 bg-slate-800 text-white rounded-lg border border-slate-700">전체 다운로드</button>
        )}
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-6 shadow-2xl">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-blue-400 text-sm uppercase tracking-wider">기준 양식 (Template)</h3>
                {templateFile && <button onClick={resetTemplate} className="text-xs text-slate-500 hover:text-red-400 transition-colors">초기화</button>}
              </div>
              <div 
                className={`relative h-32 border-2 border-dashed rounded-xl cursor-pointer overflow-hidden flex items-center justify-center transition-all ${
                  isDraggingTemplate ? 'border-blue-500 bg-blue-500/10' : 'border-slate-700 hover:border-blue-500 bg-slate-900/50'
                }`}
                onDragOver={(e) => { e.preventDefault(); setIsDraggingTemplate(true); }}
                onDragLeave={() => setIsDraggingTemplate(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDraggingTemplate(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) processTemplate(e.dataTransfer.files[0]);
                }}
                onClick={() => document.getElementById('template-upload')?.click()}
              >
                <input id="template-upload" type="file" hidden onChange={handleTemplateChange} accept="image/*" />
                {templatePreview ? (
                  <img src={templatePreview} className="w-full h-full object-contain" alt="T" />
                ) : (
                  <div className="text-center">
                    <span className="text-xl mb-1 block">{isDraggingTemplate ? '📥' : '📐'}</span>
                    <span className="text-[10px] text-slate-500">클릭/드래그</span>
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-purple-400 text-sm uppercase tracking-wider">변환 인물 (Subjects)</h3>
                {subjects.length > 0 && <button onClick={resetSubjects} className="text-xs text-slate-500 hover:text-red-400 transition-colors">초기화</button>}
              </div>
              <div 
                className={`relative h-32 border-2 border-dashed rounded-xl cursor-pointer transition-all flex items-center justify-center transition-all ${
                  isDraggingSubjects ? 'border-purple-500 bg-purple-500/10' : 'border-slate-700 hover:border-purple-500 bg-slate-900/50'
                }`}
                onDragOver={(e) => { e.preventDefault(); setIsDraggingSubjects(true); }}
                onDragLeave={() => setIsDraggingSubjects(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDraggingSubjects(false);
                  if (e.dataTransfer.files) processSubjects(e.dataTransfer.files);
                }}
                onClick={() => document.getElementById('subjects-upload')?.click()}
              >
                <input id="subjects-upload" type="file" hidden multiple onChange={handleSubjectsChange} accept="image/*" />
                <div className="text-center">
                  <span className="text-xl mb-1 block">{isDraggingSubjects ? '📥' : '👥'}</span>
                  <span className="text-[10px] text-slate-500">{subjects.length > 0 ? `${subjects.length}개 선택됨` : '클릭/드래그(다중)'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <div className="space-y-2">
              <h3 className="font-semibold text-slate-300 text-sm uppercase tracking-tight">출력 비율 설정</h3>
              <div className="flex flex-wrap gap-1.5">
                {(['1:1', '16:9', '9:16', '4:3', '3:4'] as AspectRatio[]).map(r => (
                  <AspectRatioButton key={r} ratio={r} />
                ))}
              </div>
            </div>
            
            <div className="space-y-2">
              <h3 className="font-semibold text-slate-300 text-sm uppercase tracking-tight">공통 반영 프롬프트</h3>
              <textarea
                value={additionalPrompt}
                onChange={(e) => setAdditionalPrompt(e.target.value)}
                placeholder="의상 스타일 고정, 특정 배경 추가 등..."
                className="w-full h-20 bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-slate-400 outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          <button onClick={startProcessing} disabled={!templateFile || subjects.length === 0 || isProcessing} className={`w-full py-4 rounded-xl font-bold transition-all ${isProcessing ? 'bg-slate-800 text-slate-600' : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-xl shadow-purple-900/30'}`}>
            {isProcessing ? '양식에 맞춰 일괄 변환 중...' : '양식 맞춰서 전체 생성'}
          </button>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-300">생성 결과 리스트</h3>
          <div className="grid grid-cols-1 gap-4 overflow-y-auto max-h-[600px] pr-2 scrollbar-thin scrollbar-thumb-slate-700">
            {results.map((res) => (
              <div key={res.id} onClick={() => setSelectedImage(res)} className={`relative glass-panel rounded-xl overflow-hidden border border-slate-800 p-2 cursor-pointer hover:border-blue-500/50 transition-all group ${getAspectClass(aspectRatio)}`}>
                <img src={res.url} className="w-full h-full object-contain rounded-lg" alt="Result" />
                <div className="p-2 absolute bottom-0 left-0 right-0 bg-slate-900/80 backdrop-blur-sm flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-[10px] text-slate-500 font-mono">{res.label}</span>
                  <button onClick={(e) => { e.stopPropagation(); downloadImage(res.url, `${res.label}.png`); }} className="text-xs text-blue-400 hover:text-blue-300">📥 다운로드</button>
                </div>
              </div>
            ))}
            {results.length === 0 && <div className="h-96 flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-2xl text-slate-700">
                <span className="text-4xl mb-4">🖼️</span>
                <p>결과가 여기에 표시됩니다.</p>
              </div>}
          </div>
        </div>
      </div>

      {selectedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 animate-in fade-in duration-200">
          <div className="relative max-w-5xl w-full grid grid-cols-1 md:grid-cols-2 bg-slate-900 rounded-3xl overflow-hidden border border-slate-800 shadow-2xl">
            <button onClick={() => setSelectedImage(null)} className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center bg-black/50 text-white rounded-full">✕</button>
            <div className="bg-black p-4 flex items-center justify-center"><img src={selectedImage.url} className="max-w-full max-h-[70vh] object-contain" /></div>
            <div className="p-8 space-y-6 flex flex-col">
              <h2 className="text-xl font-bold">시트 수정 모드</h2>
              <textarea value={refinePrompt} onChange={(e) => setRefinePrompt(e.target.value)} placeholder="현재 상태에서 수정할 내용 (예: 의상을 빨간색으로 변경)..." className="flex-grow bg-slate-800 border border-slate-700 rounded-xl p-4 text-sm text-slate-200 outline-none" />
              <div className="pt-4 space-y-3">
                <button onClick={handleRefine} disabled={isRefining || !refinePrompt} className="w-full py-3 bg-purple-600 text-white rounded-xl font-bold">{isRefining ? '수정 중...' : '현재 이미지 기반 수정'}</button>
                <button onClick={() => downloadImage(selectedImage.url, `sheet_final.png`)} className="w-full py-3 bg-white text-black rounded-xl font-bold">이미지 저장</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CharacterSheetView;
