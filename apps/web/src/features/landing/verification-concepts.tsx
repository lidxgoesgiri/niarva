import styles from "./story.module.css";

const concepts = [
  [
    "Approved claim",
    "Intent trace",
    "Boundary GPA 3.5",
    "Deterministic rules",
    "Browser observation",
  ],
  [
    "Kane CLI",
    "Expected vs observed",
    "Version-bound proof",
    "Fail-closed gate",
    "Human-approved repair",
  ],
];

export function VerificationConcepts() {
  return (
    <section className={styles.concepts} aria-label="Verification concepts" data-ambient>
      <p>THE LANGUAGE OF PROOF</p>
      {concepts.map((row, index) => (
        <div key={index} className={styles.conceptViewport}>
          <div className={styles.conceptTrack} data-reverse={index === 1}>
            {[0, 1].map((copy) => (
              <div key={copy} aria-hidden={copy === 1 ? true : undefined}>
                {row.map((concept) => (
                  <span key={concept}>
                    {concept}
                    <i aria-hidden="true" />
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
