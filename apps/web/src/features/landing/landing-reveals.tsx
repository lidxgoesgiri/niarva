"use client";

import { useRef, type RefObject } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const copySelector = "[data-scroll-copy]";
const cardSelector = "[data-scroll-card]";
const wordSelector = "[data-scroll-word]";
const start = "top 85%";
const wordStart = { yPercent: 100, opacity: 0 };
const cardStart = { y: 36, opacity: 0, scale: 0.97 };
const reset = { clearProps: "transform,opacity" };

function isOnScreen(element: Element) {
  const { top, bottom } = element.getBoundingClientRect();
  return top < window.innerHeight && bottom > 0;
}

export function LandingReveals({
  surface,
  active,
}: {
  surface: RefObject<HTMLDivElement | null>;
  active: boolean;
}) {
  const played = useRef(new WeakSet<Element>());

  useGSAP(
    (_, contextSafe) => {
      const main = surface.current?.querySelector("main");
      if (
        !active ||
        !contextSafe ||
        !main ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      )
        return;

      const triggers = new Map<Element, ScrollTrigger>();
      let frame = 0;
      let disposed = false;

      const canPlay = (element: Element) => {
        if (
          disposed ||
          played.current.has(element) ||
          !main.contains(element) ||
          !isOnScreen(element)
        )
          return false;
        played.current.add(element);
        return true;
      };

      const revealCopy = contextSafe((element: Element) => {
        if (!canPlay(element)) return;
        const words = element.querySelectorAll(wordSelector);
        if (element.matches(":focus-within")) {
          gsap.set(words, reset);
          return;
        }
        gsap.fromTo(words, wordStart, {
          yPercent: 0,
          opacity: 1,
          duration: 0.58,
          stagger: 0.04,
          ease: "power3.out",
          ...reset,
        });
      });

      const revealCards = contextSafe((elements: Element[]) => {
        const cards = elements.filter((element) => {
          if (!canPlay(element)) return false;
          if (!element.matches(":focus-within")) return true;
          gsap.set(element, reset);
          return false;
        });
        if (!cards.length) return;
        gsap.fromTo(cards, cardStart, {
          y: 0,
          opacity: 1,
          scale: 1,
          duration: 0.64,
          stagger: 0.08,
          ease: "power3.out",
          ...reset,
        });
      });

      const register = contextSafe(() => {
        frame = 0;
        for (const [element, trigger] of triggers) {
          if (main.contains(element) && element.getClientRects().length) continue;
          trigger.kill();
          triggers.delete(element);
        }

        for (const element of main.querySelectorAll(copySelector)) {
          if (
            triggers.has(element) ||
            played.current.has(element) ||
            !element.getClientRects().length
          )
            continue;

          if (element.hasAttribute("data-scroll-scrub")) {
            const timeline = gsap.fromTo(
              element.querySelectorAll(wordSelector),
              { opacity: 0.15, filter: "blur(4px)" },
              {
                opacity: 1,
                filter: "blur(0px)",
                ease: "none",
                stagger: 0.06,
                scrollTrigger: { trigger: element, start, end: "bottom 45%", scrub: true },
              },
            );
            if (timeline.scrollTrigger) triggers.set(element, timeline.scrollTrigger);
            continue;
          }

          // Stage content below the viewport, leaving already visible copy readable on load.
          if (element.getBoundingClientRect().top >= window.innerHeight)
            gsap.set(element.querySelectorAll(wordSelector), wordStart);
          const enter = () => revealCopy(element);
          triggers.set(
            element,
            ScrollTrigger.create({
              trigger: element,
              start,
              end: "bottom 12%",
              onEnter: enter,
              onEnterBack: enter,
            }),
          );
        }

        const cards = Array.from(main.querySelectorAll(cardSelector)).filter(
          (card) =>
            !triggers.has(card) && !played.current.has(card) && card.getClientRects().length,
        );
        if (cards.length) {
          const waiting = cards.filter(
            (card) => card.getBoundingClientRect().top >= window.innerHeight,
          );
          if (waiting.length) gsap.set(waiting, cardStart);
          const batch = ScrollTrigger.batch(cards, {
            start,
            end: "bottom 12%",
            interval: 0.08,
            onEnter: revealCards,
            onEnterBack: revealCards,
          });
          batch.forEach((trigger, index) => triggers.set(cards[index]!, trigger));
        }
        ScrollTrigger.refresh();
      });

      const schedule = () => {
        if (!disposed && !frame) frame = requestAnimationFrame(register);
      };
      const mutations = new MutationObserver((records) => {
        if (
          records.some(
            ({ type, addedNodes, removedNodes }) =>
              type === "attributes" ||
              [...addedNodes, ...removedNodes].some((node) => node.nodeType === Node.ELEMENT_NODE),
          )
        )
          schedule();
      });
      mutations.observe(main, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["hidden", "data-state"],
      });
      const resize = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(schedule);
      resize?.observe(main);
      void document.fonts?.ready.then(schedule);
      document.fonts?.addEventListener("loadingdone", schedule);
      register();

      return () => {
        disposed = true;
        cancelAnimationFrame(frame);
        mutations.disconnect();
        resize?.disconnect();
        document.fonts?.removeEventListener("loadingdone", schedule);
      };
    },
    { scope: surface, dependencies: [active, surface], revertOnUpdate: true },
  );

  return null;
}
