import { useRef, useState } from 'react';
import { useWasmModule } from './hooks/useWasmModule';
import { useRendererBridge } from './hooks/useRendererBridge';
import { RendererProvider, useRendererContext } from './context/RendererContext';
import { Toolbar } from './components/Toolbar';
import { LayerPanel } from './components/LayerPanel';
import { CanvasView } from './components/CanvasView';
import { PointOptsPanel } from './components/PointOptsPanel';
import type { LayerState } from './types/dxf';

// Inner component that has access to context
function AppInner() {
  const { bridge, setLayers, setBounds, setStatus, renderRef } = useRendererContext();
  const [layerPanelOpen, setLayerPanelOpen] = useState(false);
  const [pointOptsOpen, setPointOptsOpen]   = useState(false);
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
        // fitToScreen triggered via bounds change in CanvasView
        setStatus(`엔티티 로드 완료`);
        renderRef.current?.();
      }, 0);
    };
    reader.readAsText(file, 'utf-8');
  };

  return (
    <div className="flex flex-col h-screen bg-[#1a1a1a] text-[#e0e0e0] font-['Segoe_UI',system-ui,sans-serif] overflow-hidden select-none">
      {/* Toolbar */}
      <Toolbar
        onOpenFile={() => fileInputRef.current?.click()}
        onFit={() => { /* fitRef called inside Toolbar */ }}
        layerPanelOpen={layerPanelOpen}
        onToggleLayerPanel={() => setLayerPanelOpen(!layerPanelOpen)}
        pointOptsOpen={pointOptsOpen}
        onTogglePointOpts={() => setPointOptsOpen(!pointOptsOpen)}
      />

      {/* Point opts panel (dropdown under toolbar) */}
      {pointOptsOpen && (
        <PointOptsPanel onClose={() => setPointOptsOpen(false)} />
      )}

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        {layerPanelOpen && <LayerPanel />}
        <CanvasView />
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".dxf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) { handleFile(file); e.target.value = ''; }
        }}
      />

      {/* Drop zone */}
      <DropZone onFile={handleFile} />
    </div>
  );
}

function DropZone({ onFile }: { onFile: (f: File) => void }) {
  const { layers } = useRendererContext();
  const [dragOver, setDragOver] = useState(false);

  if (layers.length > 0) return null;

  return (
    <div
      className={`absolute inset-0 flex items-center justify-center z-10 transition-colors ${
        dragOver ? 'bg-[#1a2a3a]' : 'bg-[#111]'
      }`}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) onFile(file);
      }}
    >
      <div className="flex flex-col items-center gap-4 text-[#666]">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="1.5">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
        </svg>
        <p className="text-sm">DXF 파일을 여기에 드롭하거나</p>
      </div>
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
