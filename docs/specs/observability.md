---
type: infrastructure
---
# Observability — production behavior is answerable

"It's slow" gets answered — what, for whom, since when — from dashboards, not
console.logs and redeploys.

## Behavior

- The web app turns on OpenTelemetry when it starts
  (`apps/web/instrumentation.ts`). Every request is a trace; every Postgres
  query is a timed step inside it, recorded with its SQL text.
- Logs are structured JSON via `packages/log` (pino). Inside a request, every
  line carries `traceId`, and every line is also sent to OpenTelemetry, so a
  log line and the request it came from are one lookup apart.
- `APPLICATIONINSIGHTS_CONNECTION_STRING` is the seam. Unset, telemetry is
  off and the console shows plain log lines. Set, the same code reports to
  Application Insights, from a laptop or from production.
  `TELEMETRY_TO_CONSOLE=1` prints the telemetry to the terminal instead, for
  looking at it without Azure. `OTEL_SERVICE_NAME` names the app.
- In Application Insights, requests land in `requests`, queries in
  `dependencies`, log lines in `traces`; all three share `operation_Id`, which
  is the trace id.
- One slow request is traceable URL → handler → the exact query, in the
  portal only.

## Not yet

- Log lines don't carry user id, route, or duration unless the call site
  passes them.
- The heavy seed (500+ records) and the load script in `/load` that produce a
  repeatable performance report.
- The worker and the migrator log to the console only.

## Constraints & decisions

- Logs never contain secrets, tokens, or full request bodies. Query tracing
  records SQL text, which with Prisma means placeholders, not values.
- No alerting/SLOs at class scale (recorded, not forgotten).
- At most 5 traces a second are kept (the library's default); the rest are
  sampled out. Nowhere near a limit at class scale.

## Verify

- `TELEMETRY_TO_CONSOLE=1 pnpm dev`, then `curl localhost:3000/jobs`: the
  console prints a `GET /jobs` span and a `pg.query` span with one trace id
  between them, and any log line from that request carries the same id.
- With a connection string: the same request appears in Application
  Insights' Search view within a few minutes, and opening it shows the query
  inside.
