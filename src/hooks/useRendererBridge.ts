import { useMemo } from 'react';
import type { RendererModule } from '../types/wasm';
import { RendererBridge } from '../bridge/RendererBridge';

export function useRendererBridge(module: RendererModule | null): RendererBridge | null {
  return useMemo(
    () => (module ? new RendererBridge(module) : null),
    [module]
  );
}
