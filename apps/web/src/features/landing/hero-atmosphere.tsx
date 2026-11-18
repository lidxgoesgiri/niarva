"use client";

import { useEffect, useRef } from "react";
import { useLandingMotion } from "./landing-shell";
import type { createPortalScene } from "./portal-scene";
import styles from "./landing.module.css";

export function HeroAtmosphere() {
  const surface = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const moving = useLandingMotion();

  useEffect(() => {
    const element = surface.current;
    const target = canvas.current;
    if (!moving || !element || !target || !("IntersectionObserver" in window)) return;

    let visible = false;
    let loading = false;
    let stopped = false;
    let scene: ReturnType<typeof createPortalScene> = null;
    const frameState = (rendered: boolean) => {
      element.dataset.scene = rendered ? "webgl" : "fallback";
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? false;
      scene?.setActive(visible);
      if (!visible || loading || scene) return;
      loading = true;
      void import("./portal-scene")
        .then(({ createPortalScene }) => {
          if (stopped) return;
          scene = createPortalScene(target, frameState);
          scene?.setActive(visible);
        })
        .catch(() => {
          if (!stopped) frameState(false);
        });
    });
    observer.observe(element);
    return () => {
      stopped = true;
      observer.disconnect();
      scene?.dispose();
      frameState(false);
    };
  }, [moving]);

  return (
    <div ref={surface} className={styles.heroAtmosphere} data-scene="fallback" aria-hidden="true">
      <div className={styles.portal}>
        <span />
        <span />
        <span />
      </div>
      <canvas ref={canvas} className={styles.heroCanvas} />
    </div>
  );
}
