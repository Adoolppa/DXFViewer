import { useState } from 'react';
import { Maximize2, ZoomIn, ZoomOut, MousePointer2 } from 'lucide-react';
import * as Slider from '@radix-ui/react-slider';
import * as Switch from '@radix-ui/react-switch';
import { useRendererContext } from '../context/RendererContext';

type Tab = 'controls' | 'layers' | 'options';

// ── Controls tab ──────────────────────────────────────────────────────────────

function CoordInput({
  label, value, onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] text-[#666] w-4 flex-shrink-0">{label}</span>
      <input
        type="number"
        step="0.001"
        value={value.toFixed(3)}
        onChange={(e) => {
          const n = parseFloat(e.target.value);
          if (!isNaN(n)) onChange(n);
        }}
        className="flex-1 bg-[#252525] border border-[#333] rounded px-2 py-1 text-xs text-[#e0e0e0] outline-none focus:border-[#4fc3f7] transition-colors"
      />
    </div>
  );
}

function ControlsTab() {
  const { bridge, fitRef, editMode, setEditMode,
          selectedVertex, setSelectedVertex, renderRef } = useRendererContext();

  const zoomAt = (factor: number) => {
    window.dispatchEvent(new CustomEvent('dxf-zoom', { detail: factor }));
  };

  const toggleEditMode = () => {
    if (editMode) setSelectedVertex(null);
    setEditMode(!editMode);
  };

  const applyCoord = (axis: 'x' | 'y', value: number) => {
    if (!selectedVertex || !bridge) return;
    const newX = axis === 'x' ? value : selectedVertex.x;
    const newY = axis === 'y' ? value : selectedVertex.y;
    const ok = bridge.moveVertex(selectedVertex.entityIdx, selectedVertex.vtxIdx, newX, newY);
    if (ok) {
      setSelectedVertex({ ...selectedVertex, x: newX, y: newY });
      renderRef.current?.();
    }
  };

  return (
    <div className="p-4 flex flex-col gap-5">
      {/* Zoom */}
      <section>
        <div className="flex gap-2">
          <button
            onClick={() => zoomAt(1.25)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs bg-[#252525] border border-[#323232] rounded hover:bg-[#2e2e2e] hover:border-[#3d3d3d] transition-colors cursor-pointer text-[#bbb]"
          >
            <ZoomIn size={13} /> 확대
          </button>
          <button
            onClick={() => zoomAt(1 / 1.25)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs bg-[#252525] border border-[#323232] rounded hover:bg-[#2e2e2e] hover:border-[#3d3d3d] transition-colors cursor-pointer text-[#bbb]"
          >
            <ZoomOut size={13} /> 축소
          </button>
        </div>
      </section>

      <div className="border-t border-[#272727]" />

      {/* Point edit mode */}
      <section className="flex flex-col gap-3">
        <button
          onClick={toggleEditMode}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded border transition-colors cursor-pointer text-xs
            ${editMode
              ? 'bg-[#1a2f3a] border-[#4fc3f7] text-[#4fc3f7]'
              : 'bg-[#252525] border-[#323232] text-[#bbb] hover:bg-[#2e2e2e] hover:border-[#3d3d3d]'
            }`}
        >
          <MousePointer2 size={14} />
          점 편집
          {editMode && <span className="ml-auto text-[10px] text-[#4fc3f7]/60">활성</span>}
        </button>

        {editMode && (
          <div className="flex flex-col gap-2 px-1">
            {selectedVertex ? (
              <>
                <p className="text-[11px] text-[#555]">선택된 점 좌표</p>
                <CoordInput
                  label="X"
                  value={selectedVertex.x}
                  onChange={(v) => applyCoord('x', v)}
                />
                <CoordInput
                  label="Y"
                  value={selectedVertex.y}
                  onChange={(v) => applyCoord('y', v)}
                />
              </>
            ) : (
              <p className="text-[11px] text-[#444] text-center py-2">
                캔버스에서 점을 클릭하세요
              </p>
            )}
          </div>
        )}
      </section>

      <div className="border-t border-[#272727]" />

      {/* Fit to screen */}
      <button
        onClick={() => fitRef.current?.()}
        className="w-full flex items-center justify-center gap-2 py-2 text-xs text-[#666] hover:text-[#999] transition-colors cursor-pointer rounded hover:bg-[#222]"
      >
        <Maximize2 size={13} /> 화면에 맞추기
      </button>
    </div>
  );
}

// ── Layers tab ────────────────────────────────────────────────────────────────

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
}

function LayersTab() {
  const { bridge, layers, setLayers, renderRef } = useRendererContext();

  const toggleLayer = (name: string, visible: boolean) => {
    setLayers(layers.map((l) => (l.name === name ? { ...l, visible } : l)));
    bridge?.setLayerVisibility(name, visible);
    renderRef.current?.();
  };

  const setAllVisible = (visible: boolean) => {
    const next = layers.map((l) => ({ ...l, visible }));
    setLayers(next);
    next.forEach((l) => bridge?.setLayerVisibility(l.name, visible));
    renderRef.current?.();
  };

  const changeColor = (name: string, hex: string) => {
    setLayers(layers.map((l) => (l.name === name ? { ...l, customColor: hex } : l)));
    bridge?.setLayerColor(name, hex);
    renderRef.current?.();
  };

  if (layers.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-xs text-[#444]">
        파일을 불러오면 레이어가 표시됩니다
      </div>
    );
  }

  const sorted = [...layers].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-[#272727] flex-shrink-0">
        <span className="flex-1 text-[11px] text-[#666]">{sorted.length}개 레이어</span>
        <button
          className="px-2 py-1 text-[11px] bg-[#252525] border border-[#323232] rounded hover:bg-[#2e2e2e] cursor-pointer text-[#888] transition-colors"
          onClick={() => setAllVisible(true)}
        >
          전체
        </button>
        <button
          className="px-2 py-1 text-[11px] bg-[#252525] border border-[#323232] rounded hover:bg-[#2e2e2e] cursor-pointer text-[#888] transition-colors"
          onClick={() => setAllVisible(false)}
        >
          없음
        </button>
      </div>

      <div className="overflow-y-auto flex-1">
        {sorted.map((layer) => {
          const hexColor = layer.customColor ?? rgbToHex(layer.r, layer.g, layer.b);
          return (
            <div
              key={layer.name}
              className="flex items-center gap-2.5 px-3 py-2 border-b border-[#222] hover:bg-[#242424] cursor-pointer"
              onClick={() => toggleLayer(layer.name, !layer.visible)}
            >
              <Switch.Root
                checked={layer.visible}
                onCheckedChange={(v) => { toggleLayer(layer.name, v); }}
                onClick={(e) => e.stopPropagation()}
                className="w-8 h-4 rounded-full relative outline-none cursor-pointer flex-shrink-0 transition-colors data-[state=checked]:bg-[#4fc3f7] data-[state=unchecked]:bg-[#3a3a3a]"
              >
                <Switch.Thumb className="block w-3 h-3 bg-white rounded-full absolute top-0.5 left-0.5 transition-transform data-[state=checked]:translate-x-4" />
              </Switch.Root>

              <label
                className="w-4 h-4 rounded-sm border border-white/20 flex-shrink-0 cursor-pointer hover:scale-110 transition-transform"
                style={{ background: hexColor }}
                onClick={(e) => e.stopPropagation()}
              >
                <input
                  type="color"
                  value={hexColor}
                  className="opacity-0 w-0 h-0 absolute pointer-events-none"
                  onChange={(e) => changeColor(layer.name, e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                />
              </label>

              <span
                className="text-xs overflow-hidden text-ellipsis whitespace-nowrap flex-1 text-[#bbb]"
                title={layer.name}
              >
                {layer.name}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Options tab ───────────────────────────────────────────────────────────────

function OptionsTab() {
  const { bridge, pointOpts, setPointOpts, renderRef } = useRendererContext();

  const update = (next: typeof pointOpts) => {
    setPointOpts(next);
    bridge?.setPointOpts(next);
    renderRef.current?.();
  };

  return (
    <div className="p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-[#bbb]">점 표시</span>
        <Switch.Root
          checked={pointOpts.show}
          onCheckedChange={(v) => update({ ...pointOpts, show: v })}
          className="w-9 h-5 rounded-full relative outline-none cursor-pointer flex-shrink-0 transition-colors data-[state=checked]:bg-[#4fc3f7] data-[state=unchecked]:bg-[#3a3a3a]"
        >
          <Switch.Thumb className="block w-4 h-4 bg-white rounded-full absolute top-0.5 left-0.5 transition-transform data-[state=checked]:translate-x-4 shadow-sm" />
        </Switch.Root>
      </div>

      <div className="border-t border-[#272727]" />

      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] text-[#666] uppercase tracking-wide">직선 점</span>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={pointOpts.lineColor}
            className="w-7 h-6 p-0.5 bg-[#2a2a2a] border border-[#3a3a3a] rounded cursor-pointer"
            onChange={(e) => update({ ...pointOpts, lineColor: e.target.value })}
          />
          <Slider.Root
            value={[pointOpts.lineSize]}
            min={1} max={20} step={1}
            onValueChange={([v]) => update({ ...pointOpts, lineSize: v })}
            className="relative flex items-center flex-1 h-4 select-none cursor-pointer"
          >
            <Slider.Track className="bg-[#333] relative grow rounded-full h-1">
              <Slider.Range className="absolute bg-[#4fc3f7] rounded-full h-full" />
            </Slider.Track>
            <Slider.Thumb className="block w-3 h-3 bg-white rounded-full shadow outline-none hover:bg-[#4fc3f7]" />
          </Slider.Root>
          <span className="text-[11px] text-[#555] w-7 text-right">{pointOpts.lineSize}px</span>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] text-[#666] uppercase tracking-wide">곡선 점</span>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={pointOpts.curveColor}
            className="w-7 h-6 p-0.5 bg-[#2a2a2a] border border-[#3a3a3a] rounded cursor-pointer"
            onChange={(e) => update({ ...pointOpts, curveColor: e.target.value })}
          />
          <Slider.Root
            value={[pointOpts.curveSize]}
            min={1} max={20} step={1}
            onValueChange={([v]) => update({ ...pointOpts, curveSize: v })}
            className="relative flex items-center flex-1 h-4 select-none cursor-pointer"
          >
            <Slider.Track className="bg-[#333] relative grow rounded-full h-1">
              <Slider.Range className="absolute bg-[#4fc3f7] rounded-full h-full" />
            </Slider.Track>
            <Slider.Thumb className="block w-3 h-3 bg-white rounded-full shadow outline-none hover:bg-[#4fc3f7]" />
          </Slider.Root>
          <span className="text-[11px] text-[#555] w-7 text-right">{pointOpts.curveSize}px</span>
        </div>
      </div>
    </div>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string }[] = [
  { id: 'controls', label: '컨트롤' },
  { id: 'layers',   label: '레이어' },
  { id: 'options',  label: '보기 옵션' },
];

export function Sidebar() {
  const [activeTab, setActiveTab] = useState<Tab>('controls');

  return (
    <div className="w-64 flex-shrink-0 bg-[#1e1e1e] border-l border-[#2a2a2a] flex flex-col overflow-hidden">
      {/* Tab bar */}
      <div className="flex border-b border-[#2a2a2a] flex-shrink-0">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2.5 text-[11px] font-medium tracking-wide transition-colors cursor-pointer
              ${activeTab === tab.id
                ? 'text-[#4fc3f7] border-b-2 border-[#4fc3f7] -mb-px bg-[#1a1a1a]'
                : 'text-[#666] hover:text-[#999] hover:bg-[#222]'
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'controls' && <ControlsTab />}
        {activeTab === 'layers'   && <LayersTab />}
        {activeTab === 'options'  && <OptionsTab />}
      </div>
    </div>
  );
}
