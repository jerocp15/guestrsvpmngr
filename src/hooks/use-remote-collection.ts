import { useEffect, useRef, useState } from "react";

/**
 * Cloud-backed collection state with a localStorage-like API.
 * Loads from the backend once `enabled` is true, then debounce-saves on change.
 */
export function useRemoteCollection<T>(
  load: () => Promise<T>,
  save: (value: T) => Promise<void>,
  initial: T,
  enabled: boolean,
) {
  const [value, setValue] = useState<T>(initial);
  const [hydrated, setHydrated] = useState(false);

  const loadRef = useRef(load);
  loadRef.current = load;
  const saveRef = useRef(save);
  saveRef.current = save;

  // Load when enabled
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    setHydrated(false);
    loadRef
      .current()
      .then((data) => {
        if (active) {
          setValue(data);
          setHydrated(true);
        }
      })
      .catch((err) => {
        console.error("[useRemoteCollection] load failed", err);
        if (active) setHydrated(true);
      });
    return () => {
      active = false;
    };
  }, [enabled]);

  // Debounced save on change
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!hydrated || !enabled) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      saveRef.current(value).catch((err) =>
        console.error("[useRemoteCollection] save failed", err),
      );
    }, 600);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [value, hydrated, enabled]);

  return [value, setValue, hydrated] as const;
}
