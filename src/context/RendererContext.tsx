import { createContext, useContext, useRef, type ReactNode, useState } from 'react';
import type { RendererBridge } from '../bridge/RendererBridge';
import type { LayerState, BoundsJSON, PointOpts } from '../types/dxf';
import { DEFAULT_POINT_OPTS } from '../types/dxf';

export interface SelectedVertex {
  entityIdx: number;
  vtxIdx: number;
  x: number;
  y: number;
}

interface RendererContextValue {
  bridge: RendererBridge | null;
  layers: LayerState[];
  setLayers: (layers: LayerState[]) => void;
  bounds: BoundsJSON | null;
  setBounds: (b: BoundsJSON | null) => void;
  pointOpts: PointOpts;
  setPointOpts: (opts: PointOpts) => void;
  status: string;
  setStatus: (s: string) => void;
  // Raw entities (for ghost rendering)
  rawEntities: unknown[] | null;
  setRawEntities: (e: unknown[] | null) => void;
  // Point edit mode
  editMode: boolean;
  setEditMode: (v: boolean) => void;
  selectedVertex: SelectedVertex | null;
  setSelectedVertex: (v: SelectedVertex | null) => void;
  // CanvasView registers its render callback here
  renderRef: React.MutableRefObject<(() => void) | null>;
  fitRef: React.MutableRefObject<(() => void) | null>;
}

const RendererContext = createContext<RendererContextValue | null>(null);

export function useRendererContext() {
  const ctx = useContext(RendererContext);
  if (!ctx) throw new Error('useRendererContext must be inside RendererProvider');
  return ctx;
}

interface ProviderProps {
  bridge: RendererBridge | null;
  children: ReactNode;
}

export function RendererProvider({ bridge, children }: ProviderProps) {
  const [layers, setLayers]               = useState<LayerState[]>([]);
  const [bounds, setBounds]               = useState<BoundsJSON | null>(null);
  const [pointOpts, setPointOpts]         = useState<PointOpts>(DEFAULT_POINT_OPTS);
  const [status, setStatus]               = useState('DXF 파일을 드롭하거나 열기 버튼을 클릭하세요.');
  const [rawEntities, setRawEntities]       = useState<unknown[] | null>(null);
  const [editMode, setEditMode]             = useState(false);
  const [selectedVertex, setSelectedVertex] = useState<SelectedVertex | null>(null);
  const renderRef = useRef<(() => void) | null>(null);
  const fitRef    = useRef<(() => void) | null>(null);

  return (
    <RendererContext.Provider value={{
      bridge,
      layers, setLayers,
      bounds, setBounds,
      pointOpts, setPointOpts,
      status, setStatus,
      rawEntities, setRawEntities,
      editMode, setEditMode,
      selectedVertex, setSelectedVertex,
      renderRef, fitRef,
    }}>
      {children}
    </RendererContext.Provider>
  );
}
