export interface RendererModule {
  // DXF parsing
  parseDXF(content: string): boolean;
  getBoundsJSON(): string;
  getLayersJSON(): string;
  getEntitiesJSON(): string;
  getBlocksJSON(): string;

  // WebGL2 renderer
  initRenderer(canvasSelector: string): boolean;
  loadDocument(): void;
  setLayerVisibility(name: string, visible: boolean): void;
  setLayerColor(name: string, r: number, g: number, b: number): void;
  setViewTransform(
    scale: number, tx: number, ty: number,
    width: number, height: number, docCy: number
  ): void;
  renderFrame(): void;
  setPointOpts(
    show: boolean,
    lineR: number, lineG: number, lineB: number, lineSize: number,
    curveR: number, curveG: number, curveB: number, curveSize: number
  ): void;

  // Point editing
  pickNearestPoint(worldX: number, worldY: number, tolerance: number): string;
  moveVertex(entityIdx: number, vtxIdx: number, newX: number, newY: number): boolean;
}

// Factory function exported by MODULARIZE=1 build
export type CreateRenderer = (options?: object) => Promise<RendererModule>;
