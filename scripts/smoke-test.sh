#!/bin/sh

set -e

FRONTEND_URL="http://localhost:8080"
GRAFANA_URL="http://localhost:3000"

wait_for_ready() {
    NAME="$1"
    URL="$2"
    TIMEOUT="${3:-30}"

    echo "Waiting for $NAME..."

    for i in $(seq 1 "$TIMEOUT"); do
        if curl -fsS "$URL" >/dev/null 2>&1; then
            echo "$NAME OK."
            return 0
        fi

        sleep 1
    done

    echo "ERROR: $NAME did not become ready within ${TIMEOUT}s."
    return 1
}

assert_container_running() {
    CONTAINER="$1"

    STATUS=$(docker inspect \
        --format '{{.State.Status}}' \
        "$CONTAINER" 2>/dev/null || true)

    if [ "$STATUS" != "running" ]; then
        echo "ERROR: Container '$CONTAINER' is not running. Status: $STATUS"
        return 1
    fi

    echo "$CONTAINER is running."
}

echo "== MEXE Smoke Test =="

echo ""
echo "[1/5] Docker"

docker info >/dev/null

echo "Docker OK."

echo ""
echo "[2/5] Containers"

assert_container_running "mexe-frontend"
assert_container_running "mexe-grafana"

echo ""
echo "[3/5] Frontend Health"

wait_for_ready \
    "Frontend /api/health" \
    "$FRONTEND_URL/api/health"

echo ""
echo "[4/5] Frontend Ready"

wait_for_ready \
    "Frontend /api/ready" \
    "$FRONTEND_URL/api/ready"

echo ""
echo "[5/5] Grafana"

wait_for_ready \
    "Grafana /api/health" \
    "$GRAFANA_URL/api/health" \
    90

echo ""
echo "== SMOKE TEST PASSED =="
