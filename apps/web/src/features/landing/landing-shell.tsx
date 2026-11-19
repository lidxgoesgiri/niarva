"use client";

import dynamic from "next/dynamic";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { BrandMark } from "@/components/composites/brand-mark";
import { ButtonLink } from "@/components/ui/button";
import { bindLandingScroll } from "./scroll-choreography";
import { ScrollTrace } from "./scroll-trace";
import styles from "./landing.module.css";

const LandingReveals = dynamic(
  () => import("./landing-reveals").then((module) => module.LandingReveals).catch(() => () => null),
  {
    ssr: false,
  },
);
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
const navigationLinks = [
  ["#how-it-works", "How It Works"],
  ["#verification", "Verification"],
  ["#evidence", "Evidence"],
] as const;
const menuLinks = [
  ...navigationLinks,
  ["#golden-case", "Try Demo"],
  ["/app", "Open Workspace"],
] as const;

export function useLandingMotion() {
  return useContext(MotionContext);
}

export function LandingShell({ children }: { children: ReactNode }) {
  // Motion follows the visitor's system setting (prefers-reduced-motion) and pauses while the tab is hidden.
  const reduced = useSyncExternalStore(subscribeMotion, getReducedMotion, serverReducedMotion);
  const visible = useSyncExternalStore(subscribeVisibility, getVisible, serverVisible);
  const root = useRef<HTMLDivElement>(null);
  const moving = !reduced && visible;
  useEffect(() => {
    if (moving && !getReducedMotion() && root.current) return bindLandingScroll(root.current);
  }, [moving]);
  useEffect(() => {
    const surface = root.current;
    if (!surface || !("IntersectionObserver" in window)) return;
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
        <ScrollTrace />
        <SiteNavigation />
        {children}
        <LandingReveals surface={root} active={moving} />
      </div>
    </MotionContext>
  );
}

function SiteNavigation() {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const previousOverflow = useRef<string | null>(null);
  const destinationId = useRef<string | null>(null);
  function close() {
    dialog.current?.close();
  }
  function restore() {
    if (previousOverflow.current !== null) {
      document.body.style.setProperty("overflow", previousOverflow.current);
      previousOverflow.current = null;
    }
    const destination = destinationId.current
      ? document.getElementById(destinationId.current)
      : null;
    destinationId.current = null;
    (destination ?? trigger.current)?.focus({ preventScroll: true });
  }
  useEffect(
    () => () => {
      if (previousOverflow.current !== null)
        document.body.style.setProperty("overflow", previousOverflow.current);
    },
    [],
  );
  return (
    <header className={styles.header}>
      <div className={styles.navInner}>
        <BrandMark />
        <nav aria-label="Primary" className={styles.desktopNav}>
          {navigationLinks.map(([href, label]) => (
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
              const menu = dialog.current;
              if (!menu || menu.open) return;
              menu.showModal();
              previousOverflow.current = document.body.style.overflow;
              document.body.style.setProperty("overflow", "hidden");
            }}
          >
            <Menu size={20} aria-hidden="true" />
            <span className={styles.srOnly}>Menu</span>
          </button>
        </div>
      </div>
      <dialog
        id="landing-menu"
        ref={dialog}
        className={styles.mobileMenu}
        aria-labelledby="landing-menu-title"
        onClose={restore}
      >
        <div className={styles.menuHeading}>
          <span id="landing-menu-title">Explore NIARVA</span>
          <button type="button" onClick={close} aria-label="Close menu">
            <X aria-hidden="true" size={20} />
          </button>
        </div>
        <nav aria-label="Mobile">
          {menuLinks.map(([href, label]) => (
            <a
              key={href}
              href={href}
              onClick={(event) => {
                if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                destinationId.current = href.startsWith("#") ? href.slice(1) : null;
                close();
              }}
            >
              {label}
              <ArrowUpRight aria-hidden="true" size={18} />
            </a>
          ))}
        </nav>
      </dialog>
    </header>
  );
}
