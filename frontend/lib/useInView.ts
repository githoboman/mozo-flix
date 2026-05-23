"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Returns a ref + boolean that flips to true once the element enters the
 * viewport. Designed to pair with the `.reveal` / `.reveal.in` CSS classes.
 */
export function useInView<T extends HTMLElement>(opts: IntersectionObserverInit = {}) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px", ...opts },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, inView };
}
