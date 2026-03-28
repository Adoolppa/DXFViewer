export interface BoundsJSON {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface LayerJSON {
  name: string;
  colorIndex: number;
  r: number;
  g: number;
  b: number;
  isOff: boolean;
}

export interface LayerState extends LayerJSON {
  visible: boolean;
  customColor?: string;  // hex override, e.g. "#ff0000"
}

export interface PointOpts {
  show: boolean;
  lineColor: string;   // hex
  lineSize: number;    // radius px
  curveColor: string;  // hex
  curveSize: number;   // radius px
}

export const DEFAULT_POINT_OPTS: PointOpts = {
  show: false,
  lineColor: '#000000',
  lineSize: 2,
  curveColor: '#ff0000',
  curveSize: 1,
};
