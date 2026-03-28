import * as Switch from '@radix-ui/react-switch';
import { useRendererContext } from '../context/RendererContext';

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
}

export function LayerPanel() {
  const { bridge, layers, setLayers, renderRef } = useRendererContext();

  const toggleLayer = (name: string, visible: boolean) => {
    setLayers(layers.map((l) => l.name === name ? { ...l, visible } : l));
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
    setLayers(layers.map((l) => l.name === name ? { ...l, customColor: hex } : l));
    bridge?.setLayerColor(name, hex);
    renderRef.current?.();
  };

  const sorted = [...layers].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="w-48 flex-shrink-0 bg-[#222] border-r border-[#3a3a3a] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-1.5 px-2.5 py-2 font-semibold border-b border-[#333] flex-shrink-0">
        <span className="flex-1 text-sm">레이어</span>
        <button
          className="px-1.5 py-0.5 text-[11px] bg-[#333] border border-[#444] rounded hover:bg-[#444] cursor-pointer"
          onClick={() => setAllVisible(true)}
        >
          전체
        </button>
        <button
          className="px-1.5 py-0.5 text-[11px] bg-[#333] border border-[#444] rounded hover:bg-[#444] cursor-pointer"
          onClick={() => setAllVisible(false)}
        >
          없음
        </button>
      </div>

      {/* Layer list */}
      <div className="overflow-y-auto flex-1">
        {sorted.map((layer) => {
          const hexColor = layer.customColor ?? rgbToHex(layer.r, layer.g, layer.b);
          return (
            <div
              key={layer.name}
              className="flex items-center gap-2 px-2.5 py-1.5 border-b border-[#2a2a2a] hover:bg-[#2e2e2e] cursor-pointer"
              onClick={() => toggleLayer(layer.name, !layer.visible)}
            >
              {/* Radix Switch */}
              <Switch.Root
                checked={layer.visible}
                onCheckedChange={(v) => { toggleLayer(layer.name, v); }}
                onClick={(e) => e.stopPropagation()}
                className="w-8 h-4 rounded-full relative outline-none cursor-pointer transition-colors data-[state=checked]:bg-[#4fc3f7] data-[state=unchecked]:bg-[#444]"
              >
                <Switch.Thumb className="block w-3 h-3 bg-white rounded-full absolute top-0.5 left-0.5 transition-transform data-[state=checked]:translate-x-4" />
              </Switch.Root>

              {/* Color chip */}
              <label
                className="w-4 h-4 rounded-sm border border-white/25 flex-shrink-0 cursor-pointer hover:scale-110 transition-transform"
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

              {/* Layer name */}
              <span className="text-xs overflow-hidden text-ellipsis whitespace-nowrap flex-1" title={layer.name}>
                {layer.name}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
