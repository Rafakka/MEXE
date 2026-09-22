# M.E.X.E.

<img src="./docs/demo v0.11.gif" width="100%">

**M.E.X.E.** is an image manipulation program with an intuitive interface, where processes are presented through a **visual and transformative experience**.

The goal of MEXE is to transform images in the **simplest, most interesting, and intuitive way possible**, while remaining lightweight, practical, and easy to use.

Instead of hiding processing behind traditional controls and progress indicators, MEXE turns the laboratory itself into a visual representation of what is happening.

**The process is part of the interface.**

---

## Architecture

MEXE follows an **event- and state-driven architecture**, where the frontend reacts to changes in the laboratory's state.

The laboratory models its behavior through explicit phases and transitions. User events, domain events, and internal events drive state changes, while resilience events handle backend unavailability and recovery.

This keeps responsibilities explicit and reduces unnecessary coupling between UI components and application behavior.

The application is designed as a **stateless SaaS**, keeping image processing independent from persistent application state between requests. This makes the processing layer suitable for horizontal scaling and distributed deployment.

### Architectural principles

The project draws from several software engineering concepts:

- **DDD — Domain-Driven Design**
- **TDD — Test-Driven Development**
- **DDIA — Designing Data-Intensive Applications**
- **EDD — Event-Driven Design**
- **Refactoring** — continuous improvement of existing code without changing its externally observable behavior

These concepts are not treated as isolated patterns. They are used as tools for making architectural decisions according to the actual needs of the system.

---

## Laboratory Model

The frontend laboratory is modeled as a state machine.

A simplified representation is:

```text
                         ┌──────────────┐
                         │     idle     │
                         └──────┬───────┘
                                │
                                ▼
                         ┌──────────────┐
                         │   activated  │
                         └──────┬───────┘
                                │
                                ▼
                         ┌──────────────┐
                         │ synchronizing│
                         └──────┬───────┘
                                │
                                ▼
                         ┌──────────────┐
                         │  processing  │
                         └──────┬───────┘
                                │
                                ▼
                         ┌──────────────┐
                         │    result    │
                         └──────────────┘
```

The operation inside a phase has its own state:

```text
idle
 │
 ├── accelerating
 │
 ├── collapse
 │
 ├── revealing
 │
 ├── running
 │
 ├── completed
 │
 ├── failed
 │
 ├── reconnecting
 │
 └── offline
```

This separation is intentional.

**`phase` describes where the laboratory is in its broader lifecycle, while `operationPhase` describes what the current operation is doing.**

### Recovery model

When the backend becomes unavailable, the laboratory does not simply replace its previous state with an `offline` state.

Before reconnecting, the relevant operational state is captured:

```text
running
   │
   ▼
reconnecting
   │
   ├── backend unavailable
   │       │
   │       ▼
   │     offline
   │
   └── backend recovered
           │
           ▼
      resume process
           │
           ▼
      restore previous state
```

The recovery mechanism therefore separates three different concerns:

1. **Connection recovery** — determine whether the backend is available again.
2. **Process recovery** — determine whether an interrupted process exists and whether it can be resumed.
3. **UI state restoration** — restore the laboratory to the state that existed before reconnection.

This distinction prevents a successful network reconnection from being treated as equivalent to a successful process recovery.

---

## Stateless Processing

MEXE's image processing backend does not depend on persistent application state between requests.

The basic flow is:

```text
Request
   │
   ▼
FastAPI
   │
   ▼
Image processing
   │
   ▼
Response
```

This means the backend can process requests without requiring a session-specific process state to remain stored in the application instance.

This property is important for future distributed evolution, where multiple backend instances may process requests behind a load balancer.

---

# Current Architecture

MEXE currently consists of a frontend application, a backend application, and an operational observability stack.

```text
                         Browser
                            │
                            ▼
                    ┌─────────────┐
                    │    Nginx    │
                    │   Frontend  │
                    └──────┬──────┘
                           /api/*
                            │
                            ▼
                    ┌─────────────┐
                    │   FastAPI   │
                    │   Backend   │
                    └──────┬──────┘
                            │
                            ▼
                    Image Processing
```

The frontend and backend are independently containerized.

Nginx acts as the frontend server and reverse proxy for API requests.

---

## Health and Readiness

The backend exposes separate health and readiness concepts:

```text
Health & Readiness
├── /health
├── /ready
├── /api/ready
└── Docker HEALTHCHECK
```

The distinction allows the system to differentiate between:

- **liveness** — the application is running;
- **readiness** — the application is currently able to serve requests.

The frontend uses the Nginx reverse proxy to verify backend readiness, allowing dependency failures to propagate into the frontend's operational health state.

---

## Failure Propagation and Recovery

MEXE treats failure as part of the application's normal operational model.

A simplified dependency failure flow is:

```text
Backend
   │
   │ unavailable
   ▼
Nginx / readiness check
   │
   ▼
Frontend detects dependency failure
   │
   ▼
Laboratory enters recovery flow
   │
   ├── reconnecting
   │
   ├── offline
   │
   └── recovered
          │
          ▼
    resume interrupted
       operation
          │
          ▼
    restore UI state
```

The goal is not to pretend that failures do not happen.

The goal is to make failure **observable, explicit, recoverable, and bounded**.

---

## Observability

MEXE exposes application metrics through `/metrics`.

Prometheus collects and stores metrics.

Application logs are emitted as structured JSON to stdout.

Grafana Alloy collects container logs and forwards them to Loki.

Grafana provides dashboards, log exploration, and alerting.

```text
                    ┌──────────────┐
                    │    MEXE      │
                    └──────┬───────┘
                           │
              ┌────────────┴────────────┐
              │                         │
           /metrics                   stdout
              │                         │
              ▼                         ▼
        ┌───────────┐              ┌─────────┐
        │ Prometheus│              │  Alloy  │
        └─────┬─────┘              └────┬────┘
              │                         │
              │                         ▼
              │                      ┌──────┐
              │                      │ Loki │
              │                      └───┬──┘
              │                          │
              └──────────┬───────────────┘
                         ▼
                    ┌─────────┐
                    │ Grafana │
                    └─────────┘
                         │
                    ┌────┴────┐
                    ▼         ▼
                Dashboard   Alerts
```

Tracing remains a future capability.

---

# Testing

Testing is part of the architectural development process, rather than only a final verification step.

The project currently contains:

- backend unit tests;
- backend integration tests;
- frontend state and resilience tests;
- health/readiness tests;
- recovery behavior tests.

The resilience tests explicitly cover scenarios such as:

- backend recovery;
- restoration of the previous laboratory state;
- recovery without an interrupted process;
- interrupted processes without a registered recovery handler;
- failure while resuming an interrupted process.

This is particularly important because resilience behavior is stateful: the system must be tested not only for **whether a request succeeds**, but also for **what state the application reaches after success or failure**.

---

# Project Structure

```text
MEXE/
│
├── backend/
│   ├── app/
│   │   ├── api/            # HTTP layer and API endpoints
│   │   ├── core/           # Application configuration and core concerns
│   │   ├── domain/         # Domain logic and image processing
│   │   ├── exceptions/     # Application-specific exceptions
│   │   ├── infra/          # Infrastructure implementations
│   │   ├── schemas/        # API/data schemas
│   │   └── main.py         # FastAPI application entry point
│   │
│   ├── tests/
│   │   ├── unit/           # Unit tests
│   │   └── integration/    # Integration tests
│   │
│   ├── Dockerfile
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── api/            # API communication
│   │   ├── components/     # UI components
│   │   ├── features/       # Application state and feature logic
│   │   ├── services/       # Application services
│   │   └── store/          # Redux store configuration
│   │
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
│
├── prometheus/
│   └── prometheus.yml
│
├── grafana/
│   ├── dashboards/
│   └── provisioning/
│
├── loki/
│   └── loki-config.yaml
│
├── alloy/
│   └── config.alloy
│
├── docs/
│   ├── Diagrams/           # Architecture and system diagrams
│   └── resumo.md           # Laboratory state and behavior documentation
│
└── docker-compose.yml
```

---

# Running Locally

## Prerequisites

Make sure you have:

- Docker
- Docker Compose

## Run with Docker Compose

Clone the repository:

```bash
git clone https://github.com/Rafakka/MEXE.git
cd MEXE
```

Start the application:

```bash
docker compose up --build
```

The application can then be accessed through the frontend container.

---

# Cloud-Native Roadmap

```text
MEXE Cloud-Native Roadmap
│
├── 1. Application Foundation
│   ├── Domain architecture          ✓
│   ├── Tests                        ✓
│   ├── API                          ✓
│   └── Stateless design             ✓
│
├── 2. Containerization
│   ├── Docker                       ✓
│   ├── Docker Compose               ✓
│   └── Nginx reverse proxy          ✓
│
├── 3. Operational Health
│   ├── /health                      ✓
│   ├── /ready                       ✓
│   ├── /api/ready                   ✓
│   ├── Docker healthchecks          ✓
│   ├── Failure propagation          ✓
│   └── Recovery                     ✓
│
├── 4. CI/CD
│   ├── Automated tests              ✓
│   ├── Frontend build               ✓
│   ├── Docker build                 ✓
│   ├── Pipeline                     ✓
│   └── Deployment                   ✓
│
├── 5. Container Registry
│   └── GHCR                         ✓
│
├── 6. Cloud Deployment
│   └── First real deployment        ✓
│
├── 7. Observability
│   ├── Logs                         ✓
│   ├── Metrics                      ✓
│   ├── Dashboards                   ✓
│   ├── Alerting                     ✓
│   └── Tracing                      ← FUTURE
│
├── 8. Resilience
│   ├── Timeouts                     ✓
│   ├── Failure handling             ✓
│   ├── Recovery detection           ✓
│   ├── Process recovery             ✓
│   └── Resource limits              ← NEXT
│
├── 9. Kubernetes
│   ├── Deployment
│   ├── Service
│   ├── Probes
│   ├── Config
│   └── Scaling
│
└── 10. Distributed Evolution
    ├── Multiple instances
    ├── Stateless scaling
    ├── Load balancing
    └── Cloud-native architecture
```

---

# Philosophy

MEXE aims to balance three characteristics:

> **Lightweight. Simple. Beautiful.**

The architecture should introduce only the complexity necessary to solve a real problem.

The interface should transform technical operations into an understandable visual experience.

And the system should be capable of evolving toward distributed and cloud-native environments without introducing infrastructure that has no current purpose.

**The objective is not to make MEXE as complex as possible.**

**The objective is to make every piece of complexity justify its existence.**
