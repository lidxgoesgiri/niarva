import "server-only";
import { ENGINE_VERSION, sha256Hex } from "@niarva/core";
import { getEnv } from "./config/env";

/**
 * Identity of the renderer that Kane observes. It is computed at build time from the source of
 * the form renderer and the shared evaluation code (see next.config.ts), so any change to how a
 * form renders or validates produces a new identity and makes earlier browser proof STALE.
 */
export function rendererBuildId(): string {
  return process.env.NIARVA_RENDERER_BUILD_ID ?? "renderer-dev-unpinned";
}

/** Runtime configuration that can change what a respondent sees. */
export function runtimeConfigHash(): string {
  return sha256Hex(`rc1|locale=en-US|decimal=dot-or-comma`);
}

export function environmentId(): string {
  return getEnv().NIARVA_ENVIRONMENT_ID;
}

/** Server-side validation shares the engine, so its version is the engine version. */
export function serverValidationVersion(): string {
  return ENGINE_VERSION;
}
