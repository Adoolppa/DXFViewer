import { useEffect, useRef, useCallback } from 'react';
import { useRendererContext } from '../context/RendererContext';
import type { BoundsJSON } from '../types/dxf';

function fitToScreen(bounds: BoundsJSON, w: number, h: number) {
  const dw = bounds.maxX - bounds.minX;
  const dh = bounds.maxY - bounds.minY;
  if (dw <= 0 || dh <= 0) return null;
  const margin = 0.95;
  const scale = Math.min((w * margin) / dw, (h * margin) / dh);
  const docCx = (bounds.minX + bounds.maxX) / 2;
  const docCy = (bounds.minY + bounds.maxY) / 2;
  const tx = w / 2 - docCx * scale;
  const ty = h / 2;
  return { scale, tx, ty, docCy };
}

export function CanvasView() {
  const { bridge, bounds, pointOpts, renderRef, fitRef } = useRendererContext();

  const canvasRef     = useRef<HTMLCanvasElement>(null);
  const scaleRef      = useRef(1);
  const txRef         = useRef(0);
  const tyRef         = useRef(0);
  const docCyRef      = useRef(0);
  const dragging      = useRef(false);
  const dragStart     = useRef({ x: 0, y: 0, tx: 0, ty: 0 });
  const rafPending    = useRef(false);

  const requestRender = useCallback(() => {
    if (!bridge || rafPending.current) return;
    rafPending.current = true;
    requestAnimationFrame(() => {
      rafPending.current = false;
      if (!canvasRef.current || !bridge) return;
      const w = canvasRef.current.width;
      const h = canvasRef.current.height;
      bridge.setViewTransform(
        scaleRef.current, txRef.current, tyRef.current,
        w, h, docCyRef.current
      );
      bridge.renderFrame();
    });
  }, [bridge]);

  // Register requestRender into context so other components can trigger it
  useEffect(() => {
    renderRef.current = requestRender;
  }, [renderRef, requestRender]);

  // Register fitToScreen into context
  const doFit = useCallback(() => {
    if (!bridge || !bounds || !canvasRef.current) return;
    const w = canvasRef.current.width;
    const h = canvasRef.current.height;
    const result = fitToScreen(bounds, w, h);
    if (!result) return;
    scaleRef.current = result.scale;
    txRef.current    = result.tx;
    tyRef.current    = result.ty;
    docCyRef.current = result.docCy;
    requestRender();
  }, [bridge, bounds, requestRender]);

  useEffect(() => {
    fitRef.current = doFit;
  }, [fitRef, doFit]);

  // Init renderer once canvas mounts
  useEffect(() => {
    if (!bridge || !canvasRef.current) return;
    bridge.initRenderer('#dxf-canvas');
  }, [bridge]);

  // Re-fit when bounds change
  useEffect(() => {
    if (bounds) doFit();
  }, [bounds, doFit]);

  // Resize observer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ro = new ResizeObserver(() => {
      const wrap = canvas.parentElement;
      if (!wrap) return;
      canvas.width  = wrap.clientWidth;
      canvas.height = wrap.clientHeight;
      requestRender();
    });
    ro.observe(canvas.parentElement!);
    return () => ro.disconnect();
  }, [requestRender]);

  // Mouse wheel zoom
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
      const rect   = canvas.getBoundingClientRect();
      const cx     = e.clientX - rect.left;
      const cy     = e.clientY - rect.top;
      scaleRef.current *= factor;
      txRef.current = cx - (cx - txRef.current) * factor;
      tyRef.current = cy - (cy - tyRef.current) * factor;
      requestRender();
    };
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, [requestRender]);

  // Toolbar zoom buttons via custom event
  useEffect(() => {
    const onZoom = (e: Event) => {
      const factor = (e as CustomEvent<number>).detail;
      if (!canvasRef.current) return;
      const cx = canvasRef.current.width  / 2;
      const cy = canvasRef.current.height / 2;
      scaleRef.current *= factor;
      txRef.current = cx - (cx - txRef.current) * factor;
      tyRef.current = cy - (cy - tyRef.current) * factor;
      requestRender();
    };
    window.addEventListener('dxf-zoom', onZoom);
    return () => window.removeEventListener('dxf-zoom', onZoom);
  }, [requestRender]);

  // Point opts changes need re-render (bridge.setPointOpts already called in context)
  useEffect(() => {
    if (!bridge) return;
    bridge.setPointOpts(pointOpts);
    // tessellate & re-upload handled in C++; just trigger a frame
    requestRender();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pointOpts]);

  // Pan
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      dragging.current = true;
      dragStart.current = {
        x: e.clientX, y: e.clientY,
        tx: txRef.current, ty: tyRef.current
      };
      canvas.style.cursor = 'grabbing';
    };
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      txRef.current = dragStart.current.tx + (e.clientX - dragStart.current.x);
      tyRef.current = dragStart.current.ty + (e.clientY - dragStart.current.y);
      requestRender();
    };
    const onUp = () => {
      if (dragging.current) {
        dragging.current = false;
        canvas.style.cursor = 'crosshair';
      }
    };

    canvas.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      canvas.removeEventListener('mousedown', onDown);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [requestRender]);

  return (
    <div className="relative flex-1 overflow-hidden bg-[#111]">
      <canvas
        id="dxf-canvas"
        ref={canvasRef}
        className="absolute inset-0 cursor-crosshair"
      />
    </div>
  );
}
