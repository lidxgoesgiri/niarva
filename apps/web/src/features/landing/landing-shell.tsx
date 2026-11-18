"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { ArrowUpRight, Menu, Pause, Play, X } from "lucide-react";
import { BrandMark } from "@/components/composites/brand-mark";
import { ButtonLink } from "@/components/ui/button";
import styles from "./landing.module.css";

const MotionContext = createContext(true);
const subscribeMotion = (notify: () => void) => {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", notify);
  return () => media.removeEventListener("change", notify);
};
const getReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const subscribeVisibility = (notify: () => void) => {
  document.addEventListener("visibilitychange", notify);
  return () => document.removeEventListener("visibilitychange", notify);
};
const getVisible = () => !document.hidden;
const serverReducedMotion = () => false;
const serverVisible = () => true;

export function useLandingMotion() {
  return useContext(MotionContext);
}

export function LandingShell({ children }: { children: ReactNode }) {
  const [paused, setPaused] = useState(false);
  const reduced = useSyncExternalStore(subscribeMotion, getReducedMotion, serverReducedMotion);
  const visible = useSyncExternalStore(subscribeVisibility, getVisible, serverVisible);
  const root = useRef<HTMLDivElement>(null);
  const moving = !paused && !reduced && visible;
  useEffect(() => {
    const surface = root.current;
    if (!surface) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries)
          (entry.target as HTMLElement).dataset.inView = String(entry.isIntersecting);
      },
      { rootMargin: "80px" },
    );
    surface.querySelectorAll("[data-ambient]").forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);
  return (
    <MotionContext value={moving}>
      <div ref={root} className={styles.landing} data-motion={moving ? "running" : "paused"}>
        <div className={styles.atmosphere} aria-hidden="true" />
        <SiteNavigation />
        {children}
        <button
          type="button"
          className={styles.motionControl}
          aria-pressed={paused}
          onClick={() => setPaused(!paused)}
        >
          {paused || reduced ? (
            <Play aria-hidden="true" size={14} />
          ) : (
            <Pause aria-hidden="true" size={14} />
          )}
          {paused ? "Resume animations" : "Pause animations"}
          {reduced && <span className={styles.srOnly}> · Reduced motion is active</span>}
        </button>
      </div>
    </MotionContext>
  );
}

function SiteNavigation() {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const previousOverflow = useRef<string | null>(null);
  function close() {
    dialog.current?.close();
  }
  function restore() {
    if (previousOverflow.current !== null) {
      document.body.style.overflow = previousOverflow.current;
      previousOverflow.current = null;
    }
    trigger.current?.focus();
  }
  useEffect(
    () => () => {
      if (previousOverflow.current !== null)
        document.body.style.overflow = previousOverflow.current;
    },
    [],
  );
  const links = [
    ["#how-it-works", "How It Works"],
    ["#verification", "Verification"],
    ["#evidence", "Evidence"],
  ];
  return (
    <header className={styles.header}>
      <div className={styles.navInner}>
        <BrandMark />
        <nav aria-label="Primary" className={styles.desktopNav}>
          {links.map(([href, label]) => (
            <a key={href} href={href}>
              {label}
            </a>
          ))}
        </nav>
        <div className={styles.navActions}>
          <a href="#golden-case" className={styles.demoLink}>
            Try Demo <ArrowUpRight size={14} aria-hidden="true" />
          </a>
          <ButtonLink href="/app" variant="secondary" className={styles.workspaceLink}>
            Open Workspace
          </ButtonLink>
          <button
            ref={trigger}
            className={styles.menuTrigger}
            type="button"
            aria-haspopup="dialog"
            aria-controls="landing-menu"
            onClick={() => {
              if (dialog.current?.open) return;
              previousOverflow.current = document.body.style.overflow;
              document.body.style.overflow = "hidden";
              dialog.current?.showModal();
            }}
          >
            <Menu size={20} aria-hidden="true" />
            <span className={styles.srOnly}>Menu</span>
          </button>
        </div>
      </div>
      <dialog id="landing-menu" ref={dialog} className={styles.mobileMenu} onClose={restore}>
        <div className={styles.menuHeading}>
          <span>Explore NIARVA</span>
          <button type="button" onClick={close} aria-label="Close menu">
            <X aria-hidden="true" size={20} />
          </button>
        </div>
        <nav aria-label="Mobile">
          {[...links, ["#golden-case", "Try Demo"], ["/app", "Open Workspace"]].map(
            ([href, label]) => (
              <a key={href} href={href} onClick={close}>
                {label}
                <ArrowUpRight aria-hidden="true" size={18} />
              </a>
            ),
          )}
        </nav>
      </dialog>
    </header>
  );
}
