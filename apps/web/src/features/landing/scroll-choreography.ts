const desktopStory = "(min-width: 1100px) and (min-height: 760px)";
const clamp = (value: number) => Math.min(1, Math.max(0, value));
const stageColors = [
  [143, 111, 246],
  [248, 113, 113],
  [79, 108, 246],
  [128, 115, 239],
  [52, 211, 153],
] as const;

export const scrollStageEvent = "niarva:scroll-stage";

/** Apply decorative motion from actual scroll position without handling wheel or touch input. */
export function bindLandingScroll(surface: HTMLElement) {
  const stops = Array.from(surface.querySelectorAll<HTMLElement>("[data-scroll-stop]"));
  const [hero, gap, pipelineSection, loops, evidence] = stops;
  const sandbox = surface.querySelector<HTMLElement>("[data-scroll-sandbox]");
  const pipeline = pipelineSection?.querySelector<HTMLElement>("[data-scroll-pipeline]");
  const trace = surface.querySelector<HTMLElement>("[data-scroll-trace]");
  const percentLabel = trace?.querySelector<HTMLElement>("[data-scroll-percent]");
  if (!hero || !gap || !pipeline || !loops || !evidence || !sandbox || !trace || !percentLabel)
    return;

  surface.dataset.scrollActive = "true";
  const desktop = window.matchMedia(desktopStory);
  let frame = 0;
  let settle = 0;
  let previousY = window.scrollY;
  let previousStage = -2;

  function render() {
    frame = 0;
    const viewport = document.documentElement.clientHeight;
    if (!viewport) return;
    const scrollY = window.scrollY;
    const scrollExtent = document.documentElement.scrollHeight - viewport;
    const bounds = stops.map((stop) => stop.getBoundingClientRect());
    const sandboxBounds = sandbox!.getBoundingClientRect();
    const pipelineBounds = pipeline!.getBoundingClientRect();
    const heroProgress = clamp((80 - bounds[0]!.top) / (viewport * 0.9));
    const gapProgress = clamp((viewport * 0.77 - bounds[1]!.top) / (viewport * 0.57));
    const loopProgress = clamp((viewport * 0.82 - bounds[3]!.top) / (viewport * 0.65));
    const evidenceProgress = clamp((viewport * 0.84 - bounds[4]!.top) / (viewport * 0.77));
    const sandboxProgress = clamp((viewport * 0.96 - sandboxBounds.top) / (viewport * 0.58));
    const pipelineProgress = clamp(
      (viewport * 0.46 - pipelineBounds.top) / Math.max(1, pipelineBounds.height - viewport * 0.3),
    );
    const documentProgress = scrollExtent > 0 ? clamp(scrollY / scrollExtent) : 0;

    const traceLine = viewport * 0.44;
    let activeStop = 0;
    for (let index = 1; index < bounds.length; index++) {
      if (bounds[index]!.top <= traceLine) activeStop = index;
    }
    const nextStop = Math.min(activeStop + 1, stageColors.length - 1);
    const mix = clamp((viewport * 0.88 - bounds[nextStop]!.top) / (viewport * 0.44));
    const color = stageColors[activeStop]!.map((value, index) =>
      Math.round(value + (stageColors[nextStop]![index]! - value) * mix),
    );

    const velocity = Math.max(-2.5, Math.min(2.5, (scrollY - previousY) * 0.045));
    previousY = scrollY;
    surface.style.setProperty("--trace-color", color.join(" "));
    surface.style.setProperty("--page-progress", documentProgress.toFixed(4));
    surface.style.setProperty("--scroll-skew", `${velocity.toFixed(2)}deg`);
    hero!.style.setProperty("--hero-scroll", heroProgress.toFixed(4));
    gap!.style.setProperty("--word-progress", gapProgress.toFixed(4));
    sandbox!.style.setProperty("--sandbox-progress", sandboxProgress.toFixed(4));
    pipeline!.style.setProperty("--pipeline-progress", pipelineProgress.toFixed(4));
    loops!.style.setProperty("--loop-progress", loopProgress.toFixed(4));
    evidence!.style.setProperty("--evidence-progress", evidenceProgress.toFixed(4));
    percentLabel!.textContent = `${String(Math.round(documentProgress * 100)).padStart(2, "0")}%`;
    trace!.dataset.activeStop = String(activeStop);

    const activePipeline =
      desktop.matches && pipelineBounds.top < viewport && pipelineBounds.bottom > 110;
    const stage = activePipeline ? Math.min(3, Math.floor(pipelineProgress * 4)) : -1;
    if (stage !== previousStage) {
      previousStage = stage;
      pipeline!.dispatchEvent(new CustomEvent(scrollStageEvent, { detail: stage }));
    }
    window.clearTimeout(settle);
    settle = window.setTimeout(() => surface.style.setProperty("--scroll-skew", "0deg"), 90);
  }

  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(render);
  };
  const resize = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(schedule);
  resize?.observe(surface);
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule, { passive: true });
  desktop.addEventListener("change", schedule);
  schedule();
  return () => {
    cancelAnimationFrame(frame);
    window.clearTimeout(settle);
    resize?.disconnect();
    window.removeEventListener("scroll", schedule);
    window.removeEventListener("resize", schedule);
    desktop.removeEventListener("change", schedule);
    delete surface.dataset.scrollActive;
  };
}
