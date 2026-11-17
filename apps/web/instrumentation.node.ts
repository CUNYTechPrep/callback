// Turns on OpenTelemetry: every request, every query inside it, and every log
// line becomes telemetry.
//   APPLICATIONINSIGHTS_CONNECTION_STRING set → sent to Application Insights
//   TELEMETRY_TO_CONSOLE=1                    → printed to the terminal instead
//   neither                                   → off, and the terminal stays quiet
import { useMicrosoftOpenTelemetry } from "@microsoft/opentelemetry";

const connectionString = process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;

if (connectionString) {
  useMicrosoftOpenTelemetry({ azureMonitor: { azureMonitorExporterOptions: { connectionString } } });
} else if (process.env.TELEMETRY_TO_CONSOLE === "1") {
  useMicrosoftOpenTelemetry({ enableConsoleExporters: true });
}
