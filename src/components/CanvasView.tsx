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
  // Shader: screenX = worldX*scale + tx  → tx = w/2 - docCx*scale
  //         screenY = (docCy-worldY)*scale + ty + h/2
  //         For docCy to appear at screen center (h/2): ty = 0
  const tx = w / 2 - docCx * scale;
  const ty = 0;
  return { scale, tx, ty, docCy };
}

// Ghost overlay: draw connected lines for the dragged vertex
function drawGhostLines(
  ctx: CanvasRenderingContext2D,
  entities: unknown[],
  entityIdx: number,
  vtxIdx: number,
  ghostX: number,  // screen coords
  ghostY: number,
  toScreen: (wx: number, wy: number) => { sx: number; sy: number },
) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  const ent = entities[entityIdx] as Record<string, unknown>;
  if (!ent) return;

  ctx.save();
  ctx.strokeStyle = 'rgba(79,195,247,0.55)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 4]);

  const line = (ax: number, ay: number, bx: number, by: number) => {
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.stroke();
  };

  const type = ent.type as string;

  if (type === 'LINE') {
    const { sx: ox, sy: oy } = vtxIdx === 0
      ? toScreen(ent.x2 as number, ent.y2 as number)
      : toScreen(ent.x1 as number, ent.y1 as number);
    line(ghostX, ghostY, ox, oy);
  } else if (type === 'LWPOLYLINE') {
    const pts = ent.pts as [number, number, number][];
    if (vtxIdx > 0) {
      const { sx, sy } = toScreen(pts[vtxIdx - 1][0], pts[vtxIdx - 1][1]);
      line(sx, sy, ghostX, ghostY);
    }
    if (vtxIdx < pts.length - 1) {
      const { sx, sy } = toScreen(pts[vtxIdx + 1][0], pts[vtxIdx + 1][1]);
      line(ghostX, ghostY, sx, sy);
    }
    if (ent.closed) {
      if (vtxIdx === 0) {
        const { sx, sy } = toScreen(pts[pts.length - 1][0], pts[pts.length - 1][1]);
        line(sx, sy, ghostX, ghostY);
      } else if (vtxIdx === pts.length - 1) {
        const { sx, sy } = toScreen(pts[0][0], pts[0][1]);
        line(ghostX, ghostY, sx, sy);
      }
    }
  } else if (type === 'SPLINE') {
    const pts = ent.pts as [number, number][];
    if (vtxIdx > 0) {
      const { sx, sy } = toScreen(pts[vtxIdx - 1][0], pts[vtxIdx - 1][1]);
      line(sx, sy, ghostX, ghostY);
    }
    if (vtxIdx < pts.length - 1) {
      const { sx, sy } = toScreen(pts[vtxIdx + 1][0], pts[vtxIdx + 1][1]);
      line(ghostX, ghostY, sx, sy);
    }
  }

  // Dragged point indicator
  ctx.restore();
  ctx.fillStyle = 'rgba(79,195,247,0.9)';
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1;
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.arc(ghostX, ghostY, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

export function CanvasView() {
  const {
    bridge, bounds, pointOpts, renderRef, fitRef,
    editMode, setSelectedVertex, rawEntities,
  } = useRendererContext();

  const canvasRef      = useRef<HTMLCanvasElement>(null);
  const ghostCanvasRef = useRef<HTMLCanvasElement>(null);
  const scaleRef       = useRef(1);
  const txRef          = useRef(0);
  const tyRef          = useRef(0);
  const docCyRef       = useRef(0);
  const panDragging    = useRef(false);
  const panStart       = useRef({ x: 0, y: 0, tx: 0, ty: 0 });
  const rafPending     = useRef(false);
  const editModeRef    = useRef(editMode);
  const editDragRef    = useRef<{
    entityIdx: number; vtxIdx: number;
    worldX: number; worldY: number;
  } | null>(null);

  // Keep editModeRef in sync (avoids stale closures in pan handler)
  useEffect(() => { editModeRef.current = editMode; }, [editMode]);

  // ── Render ──────────────────────────────────────────────────────────────────

  const requestRender = useCallback(() => {
    if (!bridge || rafPending.current) return;
    rafPending.current = true;
    requestAnimationFrame(() => {
      rafPending.current = false;
      if (!canvasRef.current || !bridge) return;
      const w = canvasRef.current.width;
      const h = canvasRef.current.height;
      bridge.setViewTransform(scaleRef.current, txRef.current, tyRef.current, w, h, docCyRef.current);
      bridge.renderFrame();
    });
  }, [bridge]);

  useEffect(() => { renderRef.current = requestRender; }, [renderRef, requestRender]);

  // ── Fit ─────────────────────────────────────────────────────────────────────

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

  useEffect(() => { fitRef.current = doFit; }, [fitRef, doFit]);
  useEffect(() => {
    if (!bridge || !canvasRef.current) return;
    bridge.initRenderer('#dxf-canvas');
  }, [bridge]);
  useEffect(() => {
    if (!bounds) return;
    requestAnimationFrame(() => doFit());
  }, [bounds, doFit]);

  // ── Coordinate helpers ───────────────────────────────────────────────────────

  // Shader: screenX = worldX * scale + tx
  //         screenY = (docCy - worldY) * scale + ty + height * 0.5
  const screenToWorld = useCallback((sx: number, sy: number) => {
    const h = canvasRef.current?.height ?? 0;
    return {
      x: (sx - txRef.current) / scaleRef.current,
      y: docCyRef.current - (sy - tyRef.current - h * 0.5) / scaleRef.current,
    };
  }, []);

  const worldToScreen = useCallback((wx: number, wy: number) => {
    const h = canvasRef.current?.height ?? 0;
    return {
      sx: wx * scaleRef.current + txRef.current,
      sy: (docCyRef.current - wy) * scaleRef.current + tyRef.current + h * 0.5,
    };
  }, []);

  // ── Resize observer (syncs both canvases) ────────────────────────────────────

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ro = new ResizeObserver(() => {
      const wrap = canvas.parentElement;
      if (!wrap) return;
      const w = wrap.clientWidth, h = wrap.clientHeight;
      canvas.width  = w; canvas.height  = h;
      if (ghostCanvasRef.current) {
        ghostCanvasRef.current.width  = w;
        ghostCanvasRef.current.height = h;
      }
      requestRender();
    });
    ro.observe(canvas.parentElement!);
    return () => ro.disconnect();
  }, [requestRender]);

  // ── Wheel zoom ───────────────────────────────────────────────────────────────

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
      const rect = canvas.getBoundingClientRect();
      const cx = e.clientX - rect.left, cy = e.clientY - rect.top;
      scaleRef.current *= factor;
      txRef.current = cx - (cx - txRef.current) * factor;
      tyRef.current = cy - (cy - tyRef.current) * factor;
      requestRender();
    };
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, [requestRender]);

  // ── Toolbar zoom ─────────────────────────────────────────────────────────────

  useEffect(() => {
    const onZoom = (e: Event) => {
      const factor = (e as CustomEvent<number>).detail;
      if (!canvasRef.current) return;
      const cx = canvasRef.current.width / 2, cy = canvasRef.current.height / 2;
      scaleRef.current *= factor;
      txRef.current = cx - (cx - txRef.current) * factor;
      tyRef.current = cy - (cy - tyRef.current) * factor;
      requestRender();
    };
    window.addEventListener('dxf-zoom', onZoom);
    return () => window.removeEventListener('dxf-zoom', onZoom);
  }, [requestRender]);

  // ── Point opts ───────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!bridge) return;
    bridge.setPointOpts(pointOpts);
    requestRender();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pointOpts]);

  // ── Pan (left-drag, only when not in edit mode) ──────────────────────────────

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onDown = (e: MouseEvent) => {
      if (e.button !== 0 || editModeRef.current) return;
      panDragging.current = true;
      panStart.current = { x: e.clientX, y: e.clientY, tx: txRef.current, ty: tyRef.current };
      canvas.style.cursor = 'grabbing';
    };
    const onMove = (e: MouseEvent) => {
      if (!panDragging.current) return;
      txRef.current = panStart.current.tx + (e.clientX - panStart.current.x);
      tyRef.current = panStart.current.ty + (e.clientY - panStart.current.y);
      requestRender();
    };
    const onUp = () => {
      if (panDragging.current) {
        panDragging.current = false;
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

  // ── Edit mode: mousedown → drag → mouseup ───────────────────────────────────

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !editMode) return;

    const clearGhost = () => {
      const gc = ghostCanvasRef.current;
      if (gc) gc.getContext('2d')?.clearRect(0, 0, gc.width, gc.height);
    };

    const onDown = (e: MouseEvent) => {
      if (e.button !== 0 || !bridge) return;
      const rect = canvas.getBoundingClientRect();
      const { x, y } = screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
      const tolerance = 10 / scaleRef.current;
      const hit = bridge.pickNearestPoint(x, y, tolerance);
      if (!hit) return;
      editDragRef.current = { ...hit, worldX: hit.x, worldY: hit.y };
      setSelectedVertex(hit);
      canvas.style.cursor = 'grabbing';
      e.stopPropagation();
    };

    const onMove = (e: MouseEvent) => {
      if (!editDragRef.current) return;
      const rect = canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const { x, y } = screenToWorld(sx, sy);
      editDragRef.current.worldX = x;
      editDragRef.current.worldY = y;
      // Update sidebar coords live
      setSelectedVertex({
        entityIdx: editDragRef.current.entityIdx,
        vtxIdx:    editDragRef.current.vtxIdx,
        x, y,
      });
      // Draw ghost overlay
      const gc = ghostCanvasRef.current;
      const ctx = gc?.getContext('2d');
      if (ctx && rawEntities) {
        drawGhostLines(ctx, rawEntities, editDragRef.current.entityIdx,
          editDragRef.current.vtxIdx, sx, sy, worldToScreen);
      }
    };

    const onUp = () => {
      if (!editDragRef.current || !bridge) return;
      const { entityIdx, vtxIdx, worldX, worldY } = editDragRef.current;
      bridge.moveVertex(entityIdx, vtxIdx, worldX, worldY);
      editDragRef.current = null;
      clearGhost();
      canvas.style.cursor = 'crosshair';
      requestRender();
    };

    canvas.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      canvas.removeEventListener('mousedown', onDown);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      clearGhost();
    };
  }, [editMode, bridge, screenToWorld, worldToScreen, setSelectedVertex, rawEntities, requestRender]);

  return (
    <div className="absolute inset-0 bg-[#111]">
      <canvas id="dxf-canvas" ref={canvasRef} className="absolute inset-0 cursor-crosshair" />
      <canvas ref={ghostCanvasRef} className="absolute inset-0 pointer-events-none" />
    </div>
  );
}
