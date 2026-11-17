// Shared pino logger. One logger for the whole codebase — every package and
// app imports from here instead of creating their own. Controlled by LOG_LEVEL.
//
// Every line carries the id of the trace it belongs to, and every line is
// also handed to OpenTelemetry. Where telemetry isn't set up (the worker,
// tests, a plain `pnpm dev`), both are no-ops and you just get the console.
import pino from "pino";
import { trace } from "@opentelemetry/api";
import { logs, type AnyValueMap } from "@opentelemetry/api-logs";

const level = process.env.LOG_LEVEL ?? (process.env.NODE_ENV === "production" ? "info" : "debug");

// pino's level numbers (10–60) → OpenTelemetry's severity numbers (1–24).
const severity = (pinoLevel: number) => Math.min(21, Math.max(1, (pinoLevel / 10 - 1) * 4 + 1));

export const log = pino({
  level,
  // The request's tracking number, on every line it logs.
  mixin() {
    const traceId = trace.getActiveSpan()?.spanContext().traceId;
    return traceId ? { traceId } : {};
  },
  hooks: {
    logMethod(args, method, levelNumber) {
      const [first, second] = args as unknown[];
      const fields = typeof first === "object" && first !== null ? (first as Record<string, unknown>) : {};
      const attributes: AnyValueMap = {};
      for (const [key, value] of Object.entries(fields)) {
        attributes[key] = value instanceof Error ? (value.stack ?? String(value)) : (value as AnyValueMap[string]);
      }
      logs.getLogger("app").emit({
        severityNumber: severity(levelNumber),
        severityText: pino.levels.labels[levelNumber],
        body: typeof first === "string" ? first : typeof second === "string" ? second : "",
        attributes,
      });
      method.apply(this, args);
    },
  },
});
