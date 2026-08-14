# M.E.X.E.

<img src="./docs/demo v0.11.gif" width="100%">

**M.E.X.E.** is an image manipulation program with an intuitive interface, where processes are presented through a **visual and transformative experience**.

The goal of MEXE is to transform images in the **simplest, most interesting, and intuitive way possible**, while remaining lightweight, practical, and easy to use.

Instead of hiding processing behind traditional controls and progress indicators, MEXE turns the laboratory itself into a visual representation of what is happening. **The process is part of the interface.**

## Architecture

MEXE follows an **event- and state-driven architecture**, where the frontend reacts to changes in the laboratory's state. This allows components to maintain clearly defined responsibilities while keeping coupling between them as low as possible.

The application is designed as a **stateless SaaS**, keeping image processing independent from persistent application state between requests. This enables a simple, lightweight architecture that is naturally suited for distributed environments.

The project draws from several software engineering principles:

- **DDD — Domain-Driven Design**
- **TDD — Test-Driven Development**
- **DDIA — Designing Data-Intensive Applications**
- **EDD — Event-Driven Design**

These concepts are not treated as isolated patterns, but as principles that guide architectural decisions throughout MEXE.

## Philosophy

MEXE aims to balance three characteristics:

> **Lightweight. Simple. Beautiful.**

The architecture should remain as simple as possible, while the interface transforms technical operations into an understandable visual experience.

## Running Locally

### Prerequisites

Make sure you have the following installed:

- Docker
- Docker Compose

### Run with Docker Compose

Clone the repository:

```bash
git clone https://github.com/Rafakka/MEXE.git
cd MEXE
```

## Project Structure

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
│   │   ├── features/      # Application state and feature logic
│   │   ├── services/       # Application services
│   │   └── store/          # Redux store configuration
│   │
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
│
├── docs/
│   ├── Diagrams/           # Architecture and system diagrams
│   └── resumo.md           # Laboratory state and behavior documentation
│
└── docker-compose.yml
```

# Current Architecture

MEXE currently consists of two main services:

```text
                    Browser
                       │
                       ▼
                ┌─────────────┐
                │   Nginx     │
                │  Frontend   │
                └──────┬──────┘
                       │
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

# Health/Readiness

```text

Health & Readiness
├── /health
├── /ready
├── /api/ready
└── Docker HEALTHCHECK

```

The backend exposes independent health and readiness endpoints. The frontend uses the Nginx reverse proxy to verify backend readiness, allowing dependency failures to propagate to the frontend's container health state.

## Roadmap

### Current

- [x] Interactive image manipulation laboratory
- [x] Visual state-driven interface
- [x] React + TypeScript frontend
- [x] FastAPI backend
- [x] Image blending
- [x] Redux-based application state management
- [x] Unit and integration tests
- [x] Dockerized frontend and backend
- [x] Docker Compose orchestration
- [x] Nginx reverse proxy
- [x] Stateless image processing architecture

### Cloud Native Foundation

- [x] Containerization
- [x] Docker Compose
- [x] Backend health endpoint
- [x] Backend readiness endpoint
- [x] Frontend health/integration check
- [x] Docker HEALTHCHECK
- [x] Failure propagation
- [x] Recovery detection
- [x] Automated health tests

### Development Guidance Roadmap

````text
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
│   └── Pipeline                     ✓
│
├── 5. Container Registry
│   └── GHCR                         ✓ 
│
├── 6. Cloud Deployment              ✓ 
│   └── First real deployment
│
├── 7. Observability                 ← NEXT
│   ├── Logs
│   ├── Metrics
│   └── Tracing
│
├── 8. Resilience
│   ├── Timeouts
│   ├── Failure handling
│   └── Resource limits
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
````
