import { Fragment } from "react";
import styles from "./scroll.module.css";

export function ScrollWords({ children }: { children: string }) {
  const words = children.trim().split(/\s+/);

  return words.map((word, index) => (
    <Fragment key={index}>
      {index > 0 && " "}
      <span className={styles.wordMask}>
        <span className={styles.word} data-scroll-word>
          {word}
        </span>
      </span>
    </Fragment>
  ));
}
