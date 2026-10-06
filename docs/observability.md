# Observability

## Observability Model

MEXE observability is built around three complementary signals:

- **Logs** — describe what happened during an execution, providing detailed event and failure information.
- **Metrics** — describe the quantitative behavior of the system, such as operation volume, success/error rates, and processing duration.
- **Context** — relates signals to the same execution or operation, allowing individual events and measurements to be correlated.

Together, they allow MEXE to answer:

> **When, how, and why did an operation succeed or fail?**

This enables the system's behavior to be interpreted rather than merely recorded, supporting diagnosis, performance analysis, and optimization.

## Request Correlation

Each HTTP request receives a unique `request_id`. If the client provides an `X-Request-ID`, MEXE preserves it; otherwise, the middleware generates a new UUID.

The request ID is then propagated through the application context, included in structured logs, and returned to the client through the `X-Request-ID` response header.

This allows an individual request to be distinguished from all others and its behavior to be correlated across the observability data.

```text
HTTP Request
     │
     ▼
Request ID
     │
     ▼
Observability Middleware
     │
     ├── Application Context
     ├── Structured Logs
     └── Response Header
```

### Why the Middleware Matters

The middleware creates the observability boundary:

```text
Request enters
      ↓
Context is established
      ↓
Application executes
      ↓
Observability is produced
      ↓
Context is cleaned up
```

The middleware therefore establishes the operational context before the application executes and cleans it up after the request lifecycle completes.

## Metrics

MEXE uses two complementary metric types:

- **Counter** — answers how many and how frequently operations occur, including successful and failed operations.
- **Histogram** — answers how long operations take, allowing processing latency to be observed across different executions.

Together:

```text
Counter
  → How many operations?
  → How frequently?
  → How many succeeded/failed?

Histogram
  → How long do they take?
  → How does processing latency behave?
  → Are some executions significantly slower?
```

This becomes particularly important when MEXE is scaled horizontally. Metrics can help compare the behavior of multiple instances and identify whether one node is processing operations differently from the others.

```text
              MEXE
                │
       ┌────────┼────────┐
       ▼        ▼        ▼
     Node A   Node B   Node C
       │        │        │
    Metrics  Metrics  Metrics
       │        │        │
       └────────┼────────┘
                ▼
             Analysis
```

Request ID individualizes the execution. Counter measures its frequency at scale. Histogram measures its performance.

```text
Request Correlation
        ↓
   "Which request?"
        ↓
Metrics
   ├── Counter
   │     "How often?"
   │
   └── Histogram
         "How fast?"
        ↓
   Compare behavior
        ↓
     Diagnose
```

## Telemetry Pipeline

The telemetry pipeline is intentionally separated into specialized layers. Each layer has a specific responsibility and provides a capability to the next layer.

```text
                         MEXE
                          │
              ┌───────────┴───────────┐
              │                       │
           Metrics                   Logs
              │                       │
          /metrics                 stdout
              │                       │
              ▼                       ▼
         Prometheus                Alloy
              │                       │
              │                       ▼
              │                      Loki
              │                       │
              └───────────┬───────────┘
                          ▼
                       Grafana
                          │
                          ▼
                Operational View
```

The responsibility of each layer is deliberate:

- **MEXE Metrics** → exposes metric data through `/metrics`. MEXE does not need to know who consumes it.
- **Prometheus** → collects and stores metrics exposed through `/metrics`, making them available for metric queries and analysis.
- **MEXE Logs** → produces structured logs through `stdout`.
- **Alloy** → acts as the collection and forwarding agent, observing container logs and forwarding them to Loki.
- **Loki** → provides the infrastructure for storing and querying logs. This is where detailed investigation of events associated with a `request_id` becomes possible.
- **Grafana** → sits above the data sources and presents their signals, allowing metrics and logs to be viewed within the same operational context.

No single tool is responsible for everything. Each layer has a specific responsibility and provides a specialized capability to the next layer.

## Operational Diagnosis

Telemetry tells us what happened; observability allows us to understand why it happened and decide what to do about it.

For example, if repeated `blend` operations cause a node to fail, observability data can reveal whether the failures correlate with specific input sizes, processing durations, and memory-related errors. This can turn an observed failure into a testable hypothesis: the operation may be exceeding the resources available to the node.

From that evidence, MEXE can evaluate appropriate mitigations, such as limiting input size, changing the processing strategy, or improving resource allocation.

The purpose of the telemetry pipeline is therefore not only to collect operational data, but to make system behavior understandable enough to support diagnosis and informed engineering decisions.
