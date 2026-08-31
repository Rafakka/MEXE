#!/usr/bin/env bash

set -euo pipefail
set -x

TRIVY_IMAGE="aquasec/trivy:latest"

trap 'echo; echo "❌ Security Scan FAILED"; read -rp "Pressione ENTER para fechar..."' ERR

echo "== MEXE Security Scan =="

echo
echo "[1/6] Backend"

docker run --rm \
  -v //var/run/docker.sock:/var/run/docker.sock \
  "$TRIVY_IMAGE" \
  image \
  --severity HIGH,CRITICAL \
  --exit-code 0 \
  mexe-backend:latest

docker run --rm \
  -v //var/run/docker.sock:/var/run/docker.sock \
  "$TRIVY_IMAGE" \
  image \
  --severity CRITICAL \
  --exit-code 1 \
  mexe-backend:latest

echo
echo "[2/6] Frontend"

docker run --rm \
  -v //var/run/docker.sock:/var/run/docker.sock \
  "$TRIVY_IMAGE" \
  image \
  --severity HIGH,CRITICAL \
  --exit-code 0 \
  mexe-frontend:latest

docker run --rm \
  -v //var/run/docker.sock:/var/run/docker.sock \
  "$TRIVY_IMAGE" \
  image \
  --severity CRITICAL \
  --exit-code 1 \
  mexe-frontend:latest

echo
echo "[3/6] Alloy"

docker pull grafana/alloy:v1.19.1

docker run --rm \
  -v //var/run/docker.sock:/var/run/docker.sock \
  -v "$PWD/.trivyignore://root/.trivyignore:ro" \
  "$TRIVY_IMAGE" \
  image \
  --severity CRITICAL \
  --exit-code 1 \
  --ignorefile //root/.trivyignore \
  grafana/alloy:v1.19.1

echo
echo "[4/6] Grafana"

docker pull grafana/grafana:13.2.0

docker run --rm \
  -v //var/run/docker.sock:/var/run/docker.sock \
  "$TRIVY_IMAGE" \
  image \
  --severity CRITICAL \
  --exit-code 1 \
  grafana/grafana:13.2.0

echo
echo "[5/6] Loki"

docker pull grafana/loki:3.7.7

docker run --rm \
  -v //var/run/docker.sock:/var/run/docker.sock \
  "$TRIVY_IMAGE" \
  image \
  --severity CRITICAL \
  --exit-code 1 \
  grafana/loki:3.7.7

echo
echo "[6/6] Prometheus"

docker pull prom/prometheus:v3.14.0

docker run --rm \
  -v //var/run/docker.sock:/var/run/docker.sock \
  "$TRIVY_IMAGE" \
  image \
  --severity CRITICAL \
  --exit-code 1 \
  prom/prometheus:v3.14.0

echo
echo "== Security Scan PASSED =="
read -rp "Pressione ENTER para fechar..."
