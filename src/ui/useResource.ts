import { useEffect, useState } from 'react';

export interface ResourceState<T> {
  data: T | undefined;
  error: Error | undefined;
  loading: boolean;
}

/**
 * Load an async resource, re-running when `key` changes. Ignores the result of a
 * superseded/unmounted load. `fn` is intentionally not in the dep list; `key`
 * is the cache identity.
 */
export function useResource<T>(fn: () => Promise<T>, key: string): ResourceState<T> {
  const [state, setState] = useState<ResourceState<T>>({
    data: undefined,
    error: undefined,
    loading: true,
  });

  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: undefined }));
    fn().then(
      (data) => {
        if (alive) setState({ data, error: undefined, loading: false });
      },
      (error: unknown) => {
        if (alive) {
          setState({
            data: undefined,
            error: error instanceof Error ? error : new Error(String(error)),
            loading: false,
          });
        }
      },
    );
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return state;
}
