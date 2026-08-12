# M.E.X.E.

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

> Image transformation laboratory.

<img src="./docs/demo v0.11.gif" width="100%">

MEXE is a visual image transformation laboratory built with React and TypeScript.

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

### Next

- [ ] Improve project documentation
- [ ] Add application health checks
- [ ] Improve environment-based configuration
- [ ] Harden Docker Compose configuration
- [ ] Expand automated test coverage
- [ ] Add continuous integration with GitHub Actions
- [ ] Build and publish versioned container images
- [ ] Deploy MEXE to a cloud environment
- [ ] Add production observability
- [ ] Improve failure handling and recovery

### Future

- [ ] Automated deployment pipeline
- [ ] Horizontal scalability
- [ ] Container orchestration
- [ ] Cloud-native infrastructure
- [ ] Further architectural evolution based on real-world usage

