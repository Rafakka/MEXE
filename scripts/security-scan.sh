
#!/usr/bin/env bash

set -euo pipefail

TRIVY_IMAGE="aquasec/trivy:latest"

echo "== MEXE Security Scan =="

echo
echo "[1/6] Backend"
docker run --rm \
  -v /var/run/docker.sock:/var/run/docker.sock \
  "$TRIVY_IMAGE" \
  image \
  --severity HIGH,CRITICAL \
  --exit-code 1 \
  mexe-backend:latest

echo
echo "[2/6] Frontend"
docker run --rm \
  -v /var/run/docker.sock:/var/run/docker.sock \
  "$TRIVY_IMAGE" \
  image \
  --severity HIGH,CRITICAL \
  --exit-code 1 \
  mexe-frontend:latest

echo
echo "[3/6] Alloy"
docker pull grafana/alloy:latest

docker run --rm \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v "$PWD/.trivyignore:/root/.trivyignore:ro" \
  "$TRIVY_IMAGE" \
  image \
  --severity HIGH,CRITICAL \
  --exit-code 1 \
  --ignorefile /root/.trivyignore \
  grafana/alloy:latest

echo
echo "[4/6] Grafana"
docker pull grafana/grafana:latest

docker run --rm \
  -v /var/run/docker.sock:/var/run/docker.sock \
  "$TRIVY_IMAGE" \
  image \
  --severity HIGH,CRITICAL \
  --exit-code 1 \
  grafana/grafana:latest

echo
echo "[5/6] Loki"
docker pull grafana/loki:3.7.0

docker run --rm \
  -v /var/run/docker.sock:/var/run/docker.sock \
  "$TRIVY_IMAGE" \
  image \
  --severity HIGH,CRITICAL \
  --exit-code 1 \
  grafana/loki:3.7.0

echo
echo "[6/6] Prometheus"
docker pull prom/prometheus:latest

docker run --rm \
  -v /var/run/docker.sock:/var/run/docker.sock \
  "$TRIVY_IMAGE" \
  image \
  --severity HIGH,CRITICAL \
  --exit-code 1 \
  prom/prometheus:latest

echo
echo "== Security Scan PASSED =="
