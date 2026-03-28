import { useState, useEffect } from 'react';
import type { RendererModule, CreateRenderer } from '../types/wasm';

export function useWasmModule() {
  const [module, setModule]   = useState<RendererModule | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = '/wasm/renderer.js';
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('renderer.js 로드 실패'));
        document.head.appendChild(script);
      })
      .then(() => (window as unknown as { createRenderer: CreateRenderer }).createRenderer())
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
