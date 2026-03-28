import * as Switch from '@radix-ui/react-switch';
import * as Slider from '@radix-ui/react-slider';
import { useRendererContext } from '../context/RendererContext';

interface Props {
  onClose: () => void;
}

export function PointOptsPanel({ onClose }: Props) {
  const { bridge, pointOpts, setPointOpts, renderRef } = useRendererContext();

  const update = (next: typeof pointOpts) => {
    setPointOpts(next);
    bridge?.setPointOpts(next);
    renderRef.current?.();
  };

  return (
    <>
      {/* Backdrop (click outside to close) */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      <div className="absolute top-10 right-0 z-50 bg-[#2a2a2a] border border-[#444] rounded-b-md shadow-lg p-3 min-w-[200px] flex flex-col gap-3">

        {/* Show toggle */}
        <div className="flex items-center gap-2">
          <Switch.Root
            checked={pointOpts.show}
            onCheckedChange={(v) => update({ ...pointOpts, show: v })}
            className="w-8 h-4 rounded-full relative outline-none cursor-pointer transition-colors data-[state=checked]:bg-[#4fc3f7] data-[state=unchecked]:bg-[#444]"
          >
            <Switch.Thumb className="block w-3 h-3 bg-white rounded-full absolute top-0.5 left-0.5 transition-transform data-[state=checked]:translate-x-4" />
          </Switch.Root>
          <span className="text-xs text-[#ccc]">점 표시</span>
        </div>

        <div className="border-t border-[#3a3a3a]" />

        {/* Line point */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] text-[#aaa]">직선 점</span>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={pointOpts.lineColor}
              className="w-7 h-6 p-0.5 bg-[#333] border border-[#555] rounded cursor-pointer"
              onChange={(e) => update({ ...pointOpts, lineColor: e.target.value })}
            />
            <Slider.Root
              value={[pointOpts.lineSize]}
              min={1} max={20} step={1}
              onValueChange={([v]) => update({ ...pointOpts, lineSize: v })}
              className="relative flex items-center flex-1 h-4 select-none cursor-pointer"
            >
              <Slider.Track className="bg-[#444] relative grow rounded-full h-1">
                <Slider.Range className="absolute bg-[#4fc3f7] rounded-full h-full" />
              </Slider.Track>
              <Slider.Thumb className="block w-3 h-3 bg-white rounded-full shadow outline-none hover:bg-[#4fc3f7]" />
            </Slider.Root>
            <span className="text-[11px] text-[#777] w-6 text-right">{pointOpts.lineSize}px</span>
          </div>
        </div>

        {/* Curve point */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] text-[#aaa]">곡선 점</span>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={pointOpts.curveColor}
              className="w-7 h-6 p-0.5 bg-[#333] border border-[#555] rounded cursor-pointer"
              onChange={(e) => update({ ...pointOpts, curveColor: e.target.value })}
            />
            <Slider.Root
              value={[pointOpts.curveSize]}
              min={1} max={20} step={1}
              onValueChange={([v]) => update({ ...pointOpts, curveSize: v })}
              className="relative flex items-center flex-1 h-4 select-none cursor-pointer"
            >
              <Slider.Track className="bg-[#444] relative grow rounded-full h-1">
                <Slider.Range className="absolute bg-[#4fc3f7] rounded-full h-full" />
              </Slider.Track>
              <Slider.Thumb className="block w-3 h-3 bg-white rounded-full shadow outline-none hover:bg-[#4fc3f7]" />
            </Slider.Root>
            <span className="text-[11px] text-[#777] w-6 text-right">{pointOpts.curveSize}px</span>
          </div>
        </div>
      </div>
    </>
  );
}
