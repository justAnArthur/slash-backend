import type { ElysiaOpenTelemetryOptions } from "@elysiajs/opentelemetry"
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto"
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-node"

const isAxiomEnabled = Bun.env.AXIOM_API_TOKEN && Bun.env.AXIOM_DATASET

export default {
  spanProcessors: [
    new BatchSpanProcessor(
      new OTLPTraceExporter(
        isAxiomEnabled
          ? {
              url: "https://api.axiom.co/v1/traces",
              headers: {
                Authorization: `Bearer ${Bun.env.AXIOM_API_TOKEN}`,
                "X-Axiom-Dataset": Bun.env.AXIOM_DATASET!
              }
            }
          : undefined
      )
    )
  ]
} satisfies ElysiaOpenTelemetryOptions
