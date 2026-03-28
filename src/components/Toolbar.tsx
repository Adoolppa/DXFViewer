import { FolderOpen, Maximize2, ZoomIn, ZoomOut, Layers, Dot, Settings2 } from 'lucide-react';
import { useRendererContext } from '../context/RendererContext';

interface ToolbarProps {
  onOpenFile: () => void;
  onFit: () => void;
  layerPanelOpen: boolean;
  onToggleLayerPanel: () => void;
  pointOptsOpen: boolean;
  onTogglePointOpts: () => void;
}

function ToolbarBtn({
  onClick, title, active = false, children
}: {
  onClick: () => void;
  title: string;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`flex items-center gap-1 px-2.5 py-1 border rounded text-xs whitespace-nowrap cursor-pointer transition-colors
        ${active
          ? 'bg-[#1a3a4a] border-[#4fc3f7] text-[#4fc3f7]'
          : 'bg-[#333] border-[#444] text-[#e0e0e0] hover:bg-[#444]'
        }`}
    >
      {children}
    </button>
  );
}

export function Toolbar({
  onOpenFile, layerPanelOpen, onToggleLayerPanel,
  pointOptsOpen, onTogglePointOpts
}: ToolbarProps) {
  const { fitRef, status, pointOpts, setPointOpts, renderRef } = useRendererContext();

  const zoomAt = (factor: number) => {
    // Delegate zoom to CanvasView via a custom event
    window.dispatchEvent(new CustomEvent('dxf-zoom', { detail: factor }));
  };

  const handleTogglePoints = () => {
    const next = { ...pointOpts, show: !pointOpts.show };
    setPointOpts(next);
    // Let CanvasView pick this up via context re-render
    renderRef.current?.();
  };

  return (
    <div className="flex items-center gap-1.5 px-2.5 h-10 bg-[#2a2a2a] border-b border-[#3a3a3a] flex-shrink-0 select-none">
      <span className="font-semibold text-sm text-[#4fc3f7] mr-1.5">DXF Viewer</span>

      <ToolbarBtn onClick={onOpenFile} title="파일 열기">
        <FolderOpen size={14} /> 열기
      </ToolbarBtn>

      <ToolbarBtn onClick={() => fitRef.current?.()} title="화면에 맞추기">
        <Maximize2 size={14} /> 화면 맞춤
      </ToolbarBtn>

      <ToolbarBtn onClick={() => zoomAt(1.25)} title="확대">
        <ZoomIn size={14} />
      </ToolbarBtn>
      <ToolbarBtn onClick={() => zoomAt(1 / 1.25)} title="축소">
        <ZoomOut size={14} />
      </ToolbarBtn>

      <div className="flex-1" />

      <ToolbarBtn onClick={onToggleLayerPanel} title="레이어 패널" active={layerPanelOpen}>
        <Layers size={14} /> 레이어
      </ToolbarBtn>

      <ToolbarBtn onClick={handleTogglePoints} title="점 표시" active={pointOpts.show}>
        <Dot size={14} /> 점 표시
      </ToolbarBtn>

      <ToolbarBtn onClick={onTogglePointOpts} title="점 옵션" active={pointOptsOpen}>
        <Settings2 size={14} /> 점 옵션
      </ToolbarBtn>

      <span className="text-[#888] text-[11px] max-w-[280px] overflow-hidden text-ellipsis whitespace-nowrap ml-1">
        {status}
      </span>
    </div>
  );
}
