import type { RendererModule } from '../types/wasm';
import type { BoundsJSON, LayerJSON, PointOpts } from '../types/dxf';

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16) / 255;
  const g = parseInt(h.substring(2, 4), 16) / 255;
  const b = parseInt(h.substring(4, 6), 16) / 255;
  return [r, g, b];
}

export class RendererBridge {
  private mod: RendererModule;

  constructor(module: RendererModule) {
    this.mod = module;
  }

  parseDXF(text: string): boolean {
    return this.mod.parseDXF(text);
  }

  getBounds(): BoundsJSON {
    return JSON.parse(this.mod.getBoundsJSON()) as BoundsJSON;
  }

  getLayers(): LayerJSON[] {
    return JSON.parse(this.mod.getLayersJSON()) as LayerJSON[];
  }

  initRenderer(canvasSelector: string): boolean {
    return this.mod.initRenderer(canvasSelector);
  }

  loadDocument(): void {
    this.mod.loadDocument();
  }

  setLayerVisibility(name: string, visible: boolean): void {
    this.mod.setLayerVisibility(name, visible);
  }

  setLayerColor(name: string, hex: string): void {
    const [r, g, b] = hexToRgb(hex);
    this.mod.setLayerColor(name, r, g, b);
  }

  setViewTransform(
    scale: number, tx: number, ty: number,
    width: number, height: number, docCy: number
  ): void {
    this.mod.setViewTransform(scale, tx, ty, width, height, docCy);
  }

  renderFrame(): void {
    this.mod.renderFrame();
  }

  setPointOpts(opts: PointOpts): void {
    const [lr, lg, lb] = hexToRgb(opts.lineColor);
    const [cr, cg, cb] = hexToRgb(opts.curveColor);
    this.mod.setPointOpts(
      opts.show,
      lr, lg, lb, opts.lineSize,
      cr, cg, cb, opts.curveSize
    );
  }
}
