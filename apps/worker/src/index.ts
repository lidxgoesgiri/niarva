/**
 * NIARVA verification worker entry point.
 *
 * The worker is a separate long-running Node process because Chrome and Kane CLI
 * must never run inside a serverless function. It pulls work from the web API,
 * runs one Kane probe at a time, and reports raw results. It never computes a
 * verdict and never touches the database.
 *
 * The lease/run/report loop is added together with the verification engine.
 */
import { WORKER_VERSION } from "./version";

console.log(
  JSON.stringify({
    level: "info",
    msg: "worker scaffold started; the probe loop is not implemented in this build",
    workerVersion: WORKER_VERSION,
  }),
);
