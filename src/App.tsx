import { useRef, useState } from 'react';
import { FolderOpen } from 'lucide-react';
import { useWasmModule } from './hooks/useWasmModule';
import { useRendererBridge } from './hooks/useRendererBridge';
import { RendererProvider, useRendererContext } from './context/RendererContext';
import { Sidebar } from './components/Sidebar';
import { CanvasView } from './components/CanvasView';
import type { LayerState } from './types/dxf';

function AppInner() {
  const { bridge, setLayers, setBounds, setStatus, setRawEntities, renderRef, status } =
    useRendererContext();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (!bridge) return;
    setStatus(`읽는 중: ${file.name}`);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setStatus('파싱 중…');
      setTimeout(() => {
        const ok = bridge.parseDXF(text);
        if (!ok) {
          setStatus('파싱 실패 – DXF 형식을 확인하세요.');
          return;
        }
        const bounds = bridge.getBounds();
        const layerArr = bridge.getLayers();
        const layers: LayerState[] = layerArr.map((l) => ({
          ...l,
          visible: !l.isOff,
        }));
        setBounds(bounds);
        setLayers(layers);
        bridge.loadDocument();
        setRawEntities(bridge.getEntities());
        setStatus('엔티티 로드 완료');
        renderRef.current?.();
      }, 0);
    };
    reader.readAsText(file, 'utf-8');
  };

  return (
    <div className="flex flex-col h-screen bg-[#1a1a1a] text-[#e0e0e0] font-['Segoe_UI',system-ui,sans-serif] overflow-hidden select-none">
      {/* Header */}
      <header className="h-14 bg-[#1e1e1e] border-b border-[#2a2a2a] flex items-center px-5 flex-shrink-0">
        <div>
          <div className="text-sm font-semibold text-white tracking-wide">DXF Viewer</div>
          <div className="text-[11px] text-[#555] mt-0.5">
            DXF 도면 뷰어 · 레이어 관리 지원
          </div>
        </div>
        <div className="flex-1" />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 px-3.5 py-1.5 text-xs bg-[#252525] border border-[#353535] rounded hover:bg-[#2e2e2e] hover:border-[#404040] transition-colors cursor-pointer text-[#ccc]"
        >
          <FolderOpen size={14} /> 파일 열기
        </button>
      </header>

      {/* Main */}
      <div className="flex flex-1 overflow-hidden">
        {/* Canvas area */}
        <div className="flex-1 relative overflow-hidden">
          <CanvasView />
          <DropZone onFile={handleFile} />
        </div>

        {/* Right sidebar */}
        <Sidebar />
      </div>

      {/* Status bar */}
      <div className="h-6 bg-[#1a1a1a] border-t border-[#242424] flex items-center px-3 flex-shrink-0">
        <span className="text-[11px] text-[#4a4a4a]">{status}</span>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".dxf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            handleFile(file);
            e.target.value = '';
          }
        }}
      />
    </div>
  );
}

function DropZone({ onFile }: { onFile: (f: File) => void }) {
  const { layers } = useRendererContext();
  const [dragOver, setDragOver] = useState(false);

  if (layers.length > 0) return null;

  return (
    <div
      className={`absolute inset-0 flex flex-col items-center justify-center z-10 transition-colors ${
        dragOver ? 'bg-[#111d27]' : 'bg-[#111]'
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) onFile(file);
      }}
    >
      {/* Upload icon */}
      <div
        className={`mb-5 p-5 rounded-full border-2 border-dashed transition-colors ${
          dragOver ? 'border-[#4fc3f7]/40 bg-[#4fc3f7]/5' : 'border-[#333]'
        }`}
      >
        <svg
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          stroke={dragOver ? '#4fc3f7' : '#555'}
          strokeWidth="1.5"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
      </div>
      <p className="text-sm text-[#777]">
        DXF 파일을 여기에 드롭하거나 클릭하여 불러오기
      </p>
      <p className="text-[11px] text-[#444] mt-1.5">DXF 형식 지원</p>
    </div>
  );
}

export default function App() {
  const { module, loading, error } = useWasmModule();
  const bridge = useRendererBridge(module);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
        <div className="bg-[#2a2a2a] border border-[#444] rounded-xl px-12 py-8 flex flex-col items-center gap-4">
          <div className="w-9 h-9 border-[3px] border-[#444] border-t-[#4fc3f7] rounded-full animate-spin" />
          <div className="text-[#aaa] text-sm">WASM 로딩 중…</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-[#1a1a1a] flex items-center justify-center text-red-400">
        WASM 로드 실패: {error.message}
      </div>
    );
  }

  return (
    <RendererProvider bridge={bridge}>
      <AppInner />
    </RendererProvider>
  );
}
