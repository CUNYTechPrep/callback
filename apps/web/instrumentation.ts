// Next.js calls register() once when the server starts, before any request.
// The telemetry code only runs in the Node.js server, never the edge runtime.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./instrumentation.node");
  }
}
