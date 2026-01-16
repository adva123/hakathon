import { useEffect, useRef } from "react";

export function useKeyboard() {
  const keys = useRef({
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false,
    KeyW: false,
    KeyS: false,
    KeyA: false,
    KeyD: false,
    Space: false,
  });

  useEffect(() => {
    const down = (e) => {
      if (e.code in keys.current) {
        e.preventDefault();
        keys.current[e.code] = true;
      }
    };
    const up = (e) => {
      if (e.code in keys.current) {
        e.preventDefault();
        keys.current[e.code] = false;
      }
    };

    window.addEventListener("keydown", down, { passive: false });
    window.addEventListener("keyup", up, { passive: false });

    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  return keys;
}
