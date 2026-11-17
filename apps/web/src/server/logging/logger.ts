import "server-only";

type Level = "debug" | "info" | "warn" | "error";
type Entry = { msg: string } & Record<string, unknown>;

const REDACTED = "[redacted]";

/** Keys whose values must never reach a log line. */
const SENSITIVE_KEY = /(password|secret|token|authorization|cookie|api[-_]?key|answers|payload)/i;
/** Token-bearing query parameters and bearer credentials inside free text. */
const SENSITIVE_TEXT = [/([?&]t=)[A-Za-z0-9._~-]+/g, /(Bearer\s+)[A-Za-z0-9._~-]+/gi];

export function redact(value: unknown, depth = 0): unknown {
  if (depth > 6) return REDACTED;
  if (typeof value === "string") {
    return SENSITIVE_TEXT.reduce((text, pattern) => text.replace(pattern, `$1${REDACTED}`), value);
  }
  if (Array.isArray(value)) return value.map((item) => redact(item, depth + 1));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, inner]) => [
        key,
        SENSITIVE_KEY.test(key) ? REDACTED : redact(inner, depth + 1),
      ]),
    );
  }
  return value;
}

function write(level: Level, entry: Entry): void {
  const line = JSON.stringify({ level, time: new Date().toISOString(), ...(redact(entry) as object) });
  if (level === "error" || level === "warn") console.error(line);
  else console.log(line);
}

/** Structured JSON logger with redaction applied to every entry. */
export const logger = {
  debug: (entry: Entry) => {
    if (process.env.NODE_ENV !== "production") write("debug", entry);
  },
  info: (entry: Entry) => write("info", entry),
  warn: (entry: Entry) => write("warn", entry),
  error: (entry: Entry) => write("error", entry),
};
