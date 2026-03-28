import { useState, useEffect } from 'react';
import type { RendererModule, CreateRenderer } from '../types/wasm';

export function useWasmModule() {
  const [module, setModule]   = useState<RendererModule | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    import(/* @vite-ignore */ '/wasm/renderer.js')
      .then((m: { default: CreateRenderer }) => m.default())
      .then((mod: RendererModule) => {
        if (!cancelled) {
          setModule(mod);
          setLoading(false);
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(e instanceof Error ? e : new Error(String(e)));
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, []);

  return { module, loading, error };
}
