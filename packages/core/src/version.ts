/**
 * Version of the deterministic engine. Any change to DSL semantics, evaluation,
 * or intent verification must bump this value so that cached analyses are not reused.
 */
export const ENGINE_VERSION = "1.3.0";

/**
 * Version of the mandatory probe policy. A bump makes existing browser proof STALE.
 */
export const PROBE_POLICY_VERSION = "MPP-v3";
