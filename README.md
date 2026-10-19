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

MEXE is designed as a **stateless SaaS**, keeping image processing independent from persistent application state between requests. This allows multiple backend replicas to process requests behind a Kubernetes Service.

### Application and Runtime Architecture

The application is composed of independently containerized frontend and backend components.

The frontend is served by **Nginx**, which also acts as a reverse proxy for API requests.

The backend runs as multiple Kubernetes Pods behind a Kubernetes Service:

```text

        Browser
           │
           ▼
      Frontend / Nginx
           │
           │ /api/*
           ▼
    Kubernetes Service
    mexe-backend:8000
            │
      ├──────────────┐
      ▼              ▼
  Backend Pod 1   Backend Pod 2
      │              │
      └──────┬───────┘
             ▼
       Image Processing

```

The Kubernetes Service provides a stable endpoint for the backend while distributing requests across the available backend Pods.

The backend Pods are therefore replaceable instances of the same stateless processing application rather than independent application states.

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

Click here for details on how backend works [Backend](./docs/backend.md)

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

Click here for details on how Resilience works. [8.Resilience](./docs/mexe-laboratory-operational-model-en.md)

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

MEXE currently runs as a containerized application with Kubernetes providing the runtime orchestration layer.

The application path is:

```text
                          Browser
                            │
                            ▼
                    Frontend / Nginx
                            │
                            ▼
                       Kubernetes
                    mexe-backend:8000
                            │
                       ┌────┴────┐
                       ▼         ▼
                    Pod 1      Pod 2
                       │         │
                       └────┬────┘
                            ▼
                    Image Processing
```

The frontend and backend are independently containerized.

Nginx serves the frontend and acts as the reverse proxy for API requests.

The backend is deployed through a Kubernetes Deployment with multiple replicas. The Kubernetes Service provides a stable endpoint and distributes requests between the available backend Pods.

The backend processing layer is stateless between requests, so a Pod can be replaced without requiring application state to be transferred to another Pod.

## Operational Architecture

The application is supported by an operational observability stack running in Kubernetes:

```text

                         Kubernetes
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
  mexe-backend         security-exporter    dependency-exporter
   Deployment               │                     │
   ┌────┴────┐              │                     │
   ▼         ▼              └─────────┬───────────┘
 Pod 1     Pod 2                       │
   │         │                         │
   └────┬────┘                         │
        │                              │
        └──────────────┬───────────────┘
                       ▼
                  Prometheus
                       │
                       ▼
                    Grafana

Backend logs
     │
     ▼
    Alloy
     │
     ▼
    Loki
     │
     ▼
  Grafana

```

The current Kubernetes operational components are:

- mexe-backend — image processing API;
- security-exporter — exposes security scan results as Prometheus metrics;
- dependency-exporter — exposes dependency and Renovate state as Prometheus metrics;
- Prometheus — collects application and operational metrics;
- Alloy — collects container logs;
- Loki — stores and serves application logs;
- Grafana — provides dashboards and operational visualization.
  
This separation keeps image processing, telemetry collection, and operational state as independent components while avoiding unnecessary coupling between them.

## Health and Readiness

The backend exposes separate health and readiness concepts:

```text

Backend probes
├── /health    → liveness
└── /ready     → readiness

````

Liveness
/health indicates that the backend application process is alive and responding.

It is also used by the container HEALTHCHECK.

```text

/health
   │
   ▼
Application process responding

```

Readiness
/ready indicates whether the backend is currently able to execute its main image-processing operation.

The readiness check performs a lightweight image-processing validation before reporting the backend as ready.

Kubernetes uses this endpoint as the backend Deployment's readiness probe:

```text

Kubernetes
    │
    │ readinessProbe
    ▼
/ready
    │
    ▼
Image processing readiness check
    │
    ├── ready
    │     └── Pod receives traffic
    │
    └── not ready
          └── Pod is removed from Service endpoints

```

The distinction allows the system to differentiate between:

- liveness — the application is running and responding;
- readiness — the application is currently able to serve image-processing requests.

A backend Pod can therefore remain alive while temporarily being considered not ready to receive traffic.

The frontend exposes the backend readiness check through its Nginx API proxy:

```text

Frontend
└── /api/ready
        │
        ▼
Backend /ready

```

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

MEXE exposes application and operational telemetry through metrics and logs.

Application metrics are exposed through `/metrics` and collected by Prometheus.

Application logs are emitted to stdout. Grafana Alloy collects container logs and forwards them to Loki.

Grafana provides dashboards and operational visualization for the collected telemetry.

The current observability flow is:

```text
                         MEXE
                          │
             ┌────────────┴────────────┐
             │                         │
          /metrics                  stdout
             │                         │
             ▼                         ▼
        Prometheus                  Alloy
             │                         │
             │                         ▼
             │                        Loki
             │                         │
             └────────────┬────────────┘
                          ▼
                       Grafana
```

Tracing remains a future capability.

For in depth explanations, please read [OBSERVABILITY IN DEPTH](./docs/observability.md)

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
├── security/               # This folder contains data provided by Trivy scan
│
├── k8s/               # This folder contains kubernetes pods configurations
│
├── scripts/               # This folder contains the master bootstrap for deployment and tools from CI/CD
│
├── dependency-exporter/   # This is a custom tool that needs a gitlab token, it get metrics form gitlab.
│                            This is an optional tool.
│
├── infrastructure/
│   ├── kubernetes/
│   │   └── baselines/         
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
│   ├── Diagrams/                                         # Architecture and system diagrams
│   ├── backend-en.md                                     # Details of backend functioning and architecture 
│   ├── deploy.md                                         # Explanation how to deploy MEXE
│   ├── mexe-laboratory-operational-model-en.md           # Details of how MEXE Operation works
│   ├── mexe-laboratory-state-story-en.md                 # Details of how MEXE visual operation works
│   └── observability.md                                  # Details of how Observability works on MEXE
│
│
├── cluster.yaml                                         #  
│
└── docker-compose.yml
```

---

# Running Locally

## Prerequisites

Make sure you have:

- Docker
- Docker Compose
- Kubernetes

## Running on Powershell

Clone the repository:

```bash
git clone https://github.com/Rafakka/MEXE.git
cd MEXE/scripts
```

Start the application:

```bash
./bootstrap-master-local.ps1 all
```
This bootstrap has 3 modes with obligatory flag passing:

```
all   - do all configurations and checks in order to build and run MEXE.
kube  - do only kubernetes checks and setting up.
smoke - do the basic check on containers and basics to start up MEXE.
func  - do all functional verification on Mexe. 
```

This test checks if you have Docker installed and if the images are available, in case not, it tries to pull the latest in order to continue the deployment.

The application can then be accessed through the frontend container.

---

# Cloud-Native Roadmap

```text
MEXE
│
├── 1. Application
│   ├── Frontend Laboratory
│   ├── Backend
│   └── API
│
├── 2. Application Resilience
│   ├── reconnect
│   ├── retry
│   ├── reentry
│   └── state restoration
│
├── 3. Containers
│   ├── frontend
│   └── backend
│
├── 4. Kubernetes
│   ├── backend Deployment
│   ├── backend Service
│   ├── security-exporter
│   ├── dependency-exporter
│   ├── Prometheus
│   ├── Loki
│   └── Alloy
│
├── 5. Observability
│   ├── Metrics
│   ├── Logs
│   ├── Prometheus
│   ├── Loki
│   ├── Grafana
│   ├── Security metrics
│   └── Dependency metrics
│
├── 6. CI/CD
│   ├── Tests
│   ├── Build
│   ├── Security
│   └── Publish
│
└── 7. Cloud-Native Evolution
    ├── resource limits        ← next
    ├── controlled scaling     ← future
    ├── rollout/rollback       ← strengthen
    └── production cloud      ← future
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
