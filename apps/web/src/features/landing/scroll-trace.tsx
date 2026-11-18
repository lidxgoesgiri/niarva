import styles from "./scroll.module.css";

const stops = ["Intent", "Gap", "Pipeline", "Loops", "Proof"];

export function ScrollTrace() {
  return (
    <aside className={styles.scrollTrace} data-scroll-trace data-active-stop="0" aria-hidden="true">
      <span>Scroll trace</span>
      <strong data-scroll-percent>00%</strong>
      <ol>
        {stops.map((stop, index) => (
          <li key={stop} data-stop={index}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            {stop}
          </li>
        ))}
      </ol>
    </aside>
  );
}
