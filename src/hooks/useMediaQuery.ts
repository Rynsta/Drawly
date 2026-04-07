"use client";

import { useEffect, useState } from "react";

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const m = window.matchMedia(query);
    setMatches(m.matches);
    const fn = () => setMatches(m.matches);
    m.addEventListener("change", fn);
    return () => m.removeEventListener("change", fn);
  }, [query]);

  return matches;
}
