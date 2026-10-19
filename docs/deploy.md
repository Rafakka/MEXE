# MEXE Deployment

This document explains how MEXE is deployed locally and how it is validated and published through CI/CD.

The two flows are intentionally different:

- **Local deployment** prepares a complete development environment on the machine.
- **CI/CD deployment** validates the project in isolated CI jobs, builds the images, runs security checks, and publishes images from the default branch.

They converge on the same core idea: **build reliable application artifacts, validate them, and only then move them forward.**

---

## 1. Local Deployment

Local deployment is orchestrated by:

```powershell
.\scripts\bootstrap-master-local.ps1 all
```

The master bootstrap acts as the **entry point and coordinator**. It does not contain the actual infrastructure or application logic; it delegates that work to specialized scripts.

### Local flow

```text
bootstrap-master-local.ps1
        │
        ├── Prerequisites
        │
        ├── Docker Compose
        │       │
        │       └── smoke-test.ps1
        │
        ├── kube-bootstrap.ps1
        │       │
        │       ├── Kind
        │       ├── Local images → Kind
        │       ├── Kubernetes manifests
        │       └── Optional exporters
        │
        └── func-bootstrap.ps1
                │
                ├── Backend /health
                └── Backend /ready
                        └── Blend
```

### Step 1 — Prerequisites

The master bootstrap checks that the required local environment exists:

- Docker
- `kubectl`
- Kind
- `cluster.yaml`
- `k8s/`
- `scripts/`

If a prerequisite is missing, the process stops immediately.

### Step 2 — Docker Compose

The master bootstrap starts the host-side services:

```powershell
docker compose up -d --build
```

These services include:

- MEXE frontend
- Grafana

The master bootstrap then runs:

```powershell
.\scripts\smoke-test.ps1
```

### Step 3 — Smoke Test

`smoke-test.ps1` validates the host runtime only.

It checks:

1. Docker is available.
2. `mexe-frontend` is running.
3. `mexe-grafana` is running.
4. Frontend `/api/health` responds.
5. Frontend `/api/ready` responds.
6. Grafana `/api/health` responds.

It intentionally does **not** validate Kubernetes or backend functionality.

### Step 4 — Kubernetes

The master bootstrap runs:

```powershell
.\scripts\kube-bootstrap.ps1
```

`kube-bootstrap.ps1` is responsible for the local Kubernetes environment.

It:

1. Verifies or creates the Kind cluster.
2. Loads required local Docker images into Kind.
3. Applies the Kubernetes manifests.
4. Enables optional exporters when their prerequisites are available.
5. Waits for the Kubernetes workloads to become ready.

The backend runs inside Kind and is exposed locally through a NodePort.

### Step 5 — Functional Validation

Finally, the master bootstrap runs:

```powershell
.\scripts\func-bootstrap.ps1
```

This validates the backend runtime:

```text
/health
   ↓
/ready
   ↓
blend
```

The `/ready` endpoint already executes the backend blend, so no separate blend test is necessary.

### Local deployment modes

The master bootstrap can also run individual stages:

```powershell
.\scripts\bootstrap-master-local.ps1 smoke
.\scripts\bootstrap-master-local.ps1 kube
.\scripts\bootstrap-master-local.ps1 func
```

Or everything:

```powershell
.\scripts\bootstrap-master-local.ps1 all
```

The `all` mode stops at the first failure.

---

## 2. CI/CD Deployment

CI/CD does **not** reproduce the local Kind environment.

Instead, GitLab CI uses isolated jobs to progressively validate the project, build images, scan them, and publish them.

The pipeline is:

```text
Test
  │
  ├── integration-test
  ├── backend-tests
  └── frontend-build
       │
       ▼
Build
  │
  ├── docker-backend
  └── docker-frontend
       │
       ▼
Security
  │
  └── security-scan
       │
       ▼
Publish
  │
  └── publish-images
```

A later stage is only reached when the previous stage succeeds.

### Test Stage

#### `integration-test`

Starts the application with Docker Compose inside CI:

```text
Docker-in-Docker
      │
      └── Docker Compose
              │
              └── Smoke Test
```

It verifies that the Compose-based application can start and pass the smoke test.

After the test, Compose is shut down and logs are collected.

#### `backend-tests`

Runs the backend test suite with:

```bash
python -m pytest
```

#### `frontend-build`

Installs frontend dependencies and verifies that the frontend can be built:

```bash
npm ci
npm run build
```

---

## 3. Build Stage

The build stage creates the Docker images.

### `docker-backend`

Builds the backend for:

```text
linux/amd64
```

The resulting local test image is scanned with Trivy for critical vulnerabilities.

It then verifies that the backend can be built for:

```text
linux/amd64
linux/arm64
```

### `docker-frontend`

Performs the same process for the frontend:

1. Build an `amd64` image.
2. Scan it with Trivy.
3. Verify multi-architecture builds for `amd64` and `arm64`.

---

## 4. Security Stage

`security-scan` checks the infrastructure images used by MEXE.

Currently these include:

- Grafana Alloy
- Grafana
- Loki
- Prometheus

Trivy is used to detect critical vulnerabilities.

If the security stage fails, the pipeline does not reach publishing.

---

## 5. Publish Stage

Publishing is restricted to the default branch.

The job builds and pushes multi-architecture images to GHCR:

```text
ghcr.io/rafakka/mexe-backend:$CI_COMMIT_SHA
ghcr.io/rafakka/mexe-frontend:$CI_COMMIT_SHA
```

The commit SHA makes the published image directly traceable to the source commit that produced it.

Publishing happens only after the previous stages succeed.

---

## 6. Local vs CI/CD

The two systems have different responsibilities.

| Local | CI/CD |
|---|---|
| Developer environment | Automated validation |
| Docker Compose | Docker Compose in CI |
| Kind Kubernetes | No Kind deployment |
| Local Docker images loaded into Kind | Images built in isolated jobs |
| Runtime smoke test | Integration test |
| Backend `/health` + `/ready` | Backend unit/integration tests |
| Local functional acceptance | Build and security gates |
| Reconstructs the complete local environment | Produces validated artifacts |
| Used to work on MEXE | Used to decide whether artifacts are safe to publish |

This difference is intentional.

**Local deployment answers:**

> "Can I reconstruct and run the MEXE environment on my machine?"

**CI/CD answers:**

> "Does this change pass the automated tests, build successfully, pass security checks, and deserve to be published?"

---

## 7. Where They Converge

Although the environments are different, both flows follow the same high-level lifecycle:

```text
        SOURCE CODE
             │
             ▼
          BUILD
             │
             ▼
          VERIFY
             │
             ▼
          VALIDATE
             │
             ▼
        TRUSTED ARTIFACT
```

Locally, this becomes:

```text
Source
  ↓
Compose + Kind
  ↓
Smoke + Functional checks
  ↓
Usable MEXE environment
```

In CI/CD, this becomes:

```text
Source
  ↓
Tests
  ↓
Build
  ↓
Security
  ↓
Published Docker images
```

The important architectural boundary is:

> **Local bootstrap reconstructs an environment. CI/CD validates and promotes artifacts.**

The local bootstrap is therefore not a replacement for the CI/CD pipeline, and the CI/CD pipeline is not a replacement for the local bootstrap.

They solve different problems while enforcing the same principle:

**MEXE should not move forward until the relevant layer has been validated.**

---

## 8. Where to Modify Things

When changing the deployment system, start here:

| If you need to change... | Look at... |
|---|---|
| Local orchestration | `scripts/bootstrap-master-local.ps1` |
| Local Compose validation | `scripts/smoke-test.ps1` |
| Local Kubernetes setup | `scripts/kube-bootstrap.ps1` |
| Local backend validation | `scripts/func-bootstrap.ps1` |
| Kubernetes resources | `k8s/` |
| Kind cluster configuration | `cluster.yaml` |
| CI/CD pipeline | `.gitlab-ci.yml` |
| Backend tests | `backend/` |
| Frontend build | `frontend/` |

### Rule of thumb

Do not put everything into the master bootstrap.

The master script should remain a **coordinator**:

```text
Master
  ├── Compose
  ├── Smoke
  ├── Kubernetes
  └── Functional validation
```

Each specialized script should own its own responsibility.

This keeps the deployment system understandable and makes future changes easier to locate.
