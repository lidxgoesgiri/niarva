/**
 * Public API of `@niarva/core`.
 *
 * This package is the only source of positive verification status in NIARVA.
 * It must stay pure: no network, no filesystem, no clock, no randomness.
 */
export { ENGINE_VERSION, PROBE_POLICY_VERSION } from "./version";
