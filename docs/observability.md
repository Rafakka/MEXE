# Observability

## Observability Model

MEXE observability is built around two primary telemetry signals and a correlation mechanism:

- **Logs** — describe what happened during an execution, providing detailed event and failure information.
- **Metrics** — describe the quantitative behavior of the system, such as operation volume, success/error rates, and processing duration.
- **Request context** — connects logs and application activity to the same HTTP request through a unique `request_id`.

Together, they allow MEXE to answer:

> **When, how, and why did an operation succeed or fail?**

The signals serve different purposes:

```text
               Request
                  │
   ├── request_id ───────────────┐
   │                             │
   ▼                             ▼
Logs                         Metrics
"What happened?"             "How much/how fast?"
   │                             │
   └──────────────┬──────────────┘
                  ▼
              Diagnosis
```

Metrics provide the quantitative view of system behavior, while logs provide detailed execution context. The request ID connects individual HTTP executions to their corresponding application events.

This allows MEXE to move from simply recording system behavior toward understanding and diagnosing it.


## Request Correlation

Each HTTP request receives a unique request_id.

If the client provides an X-Request-ID, MEXE preserves it. Otherwise, the middleware generates a new UUID.

The request ID is propagated through the application context, included in structured logs, and returned to the client through the X-Request-ID response header.

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

The middleware establishes the observability context around the request lifecycle:

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

MEXE exposes Prometheus-compatible metrics through the `/metrics` endpoint.

The application uses two primary metric types:

- **Counter** — measures the number of operations and their outcomes.
- **Histogram** — measures operation duration and latency distribution.

The metrics are labeled to preserve operational context.

### Counters

Counters track operation volume and result status.

The main dimensions are:

```text
operation
status
```

This allows the system to distinguish, for example:

```text

blend + success
blend + error
reentry + success
reentry + error

```

Counters answer questions such as:

- How many operations were executed?
- How many succeeded?
- How many failed?
- Which operation is generating more errors?

## Histogram

Histograms measure processing duration.

The main dimensions are:

```text
operation
stage
```

This allows MEXE to observe both complete operation duration and individual processing stages.

Examples of measured stages include:

```text
decode
normalize
blend
encode
```

Histograms answer questions such as:

- How long are operations taking?
- How is latency distributed?
- Which processing stage is consuming the most time?
- Are executions becoming progressively slower?

## Metric Context

Metrics describe aggregate system behavior rather than individual requests.

Request correlation is therefore complementary:

```text

Request ID
    │
    └── identifies an individual execution

Counters
    │
    └── measure operation volume and outcomes

Histograms
    │
    └── measure duration and latency distribution

```

This distinction allows MEXE to use metrics for detecting patterns and logs for investigating individual executions.

## Horizontal Execution

Because the backend is deployed with multiple Kubernetes Pods, metrics represent the behavior of the application across the available replicas.

The Kubernetes runtime distributes requests between backend Pods:

```text
                    Kubernetes Service
                           │
              ┌────────────┴────────────┐
              ▼                         ▼
        Backend Pod 1              Backend Pod 2
              │                         │
              └────────────┬────────────┘
                           ▼
                    Prometheus
```

Prometheus therefore provides the aggregated operational view needed to understand the behavior of the replicated backend.

The /metrics endpoint remains intentionally independent from Prometheus. MEXE exposes the measurements; Prometheus is responsible for collecting and storing them.

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

MEXE separates telemetry production, collection, storage, and visualization into specialized components.

The current telemetry flow is:

```text
                         MEXE
                          │
              ┌───────────┴───────────┐
              │                       |
          /metrics                  stdout
              │                       │
              ▼                       ▼
         Prometheus                  Alloy
              │                       │
              │                       ▼
              │                     Loki
              │                       │
              └───────────┬───────────┘
                          ▼
                       Grafana

```

The responsibility of each layer is deliberate:

- **MEXE Metrics** → exposes metric data through `GET/metrics`.
     MEXE is responsible only for producing and exposing the measurements.
     It does not know which system consumes them.
  
- **Prometheus** → Collects metrics from the MEXE /metrics endpoint and stores them as time-series data.
     Its responsibility is to provide the quantitative history of system behavior.
     Prometheus can therefore be used to analyze:
          - operation volume;
          - success and error rates;
          - processing duration;
          - latency distribution;
          - security metrics;
          - dependency and Renovate metrics.
  
- **MEXE Logs** → produces structured logs through `stdout`.
      The application does not directly manage log storage or querying.
      This keeps the application independent from the log aggregation system.
  
- **Alloy** → acts as the log collection and forwarding layer.
       The current Kubernetes flow is:
  
       ```text
  
       Backend Pods
       │
       │ container logs
       ▼
      Alloy
       │
       │ Loki protocol
       ▼
      Loki
  
       ```
  Alloy discovers Kubernetes Pods, collects their container logs, and forwards them to Loki.
  The backend therefore does not need to know that Loki or Alloy exists.
  
- **Loki** → stores and serves application logs collected by Alloy.
  It provides the log query layer used for operational investigation.
  Request correlation allows logs associated with a specific request_id to be located and investigated.
  
- **Grafana** → provides the operational visualization layer.
     It queries Prometheus for metrics and Loki for logs, allowing quantitative behavior and detailed execution information to be investigated from the same operational interface.
     The separation can therefore be summarized as:
  
  ```text
  
       MEXE
      │
      ├── produces metrics ──────► Prometheus
      │
      └── produces logs ─────────► Alloy ─────► Loki
                                     
     Prometheus ──────┐
                      ├────► Grafana
     Loki ────────────┘
  
  ```

No single tool is responsible for everything. MEXE produces telemetry, specialized infrastructure components collect and store it, and Grafana provides the operational view.

## Operational Diagnosis

Telemetry tells us what happened; observability allows us to understand why it happened and decide what to do about it.

For example, if repeated `blend` operations cause a node to fail, observability data can reveal whether the failures correlate with specific input sizes, processing durations, and memory-related errors. This can turn an observed failure into a testable hypothesis: the operation may be exceeding the resources available to the node.

From that evidence, MEXE can evaluate appropriate mitigations, such as limiting input size, changing the processing strategy, or improving resource allocation.

The purpose of the telemetry pipeline is therefore not only to collect operational data, but to make system behavior understandable enough to support diagnosis and informed engineering decisions.
