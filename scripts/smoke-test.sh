#!/bin/sh

set -e

FRONTEND_URL="http://localhost:8080"
GRAFANA_URL="http://localhost:3000"

wait_for_ready() {
    NAME="$1"
    URL="$2"
    TIMEOUT="${3:-30}"
    FAIL_ON_TIMEOUT="${4:-true}"

    echo "Waiting for $NAME..."

    for i in $(seq 1 "$TIMEOUT"); do
        if curl -fsS "$URL" >/dev/null 2>&1; then
            echo "$NAME OK."
            return 0
        fi

        sleep 1
    done

    if [ "$FAIL_ON_TIMEOUT" = "true" ]; then
        echo "ERROR: $NAME did not become ready within ${TIMEOUT}s."
        return 1
    fi

    echo "WARNING: $NAME did not become ready within ${TIMEOUT}s."
    return 0
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
echo "[1/4] Docker"

docker info >/dev/null

echo "Docker OK."

echo ""
echo "[2/4] Containers"

assert_container_running "mexe-frontend"
assert_container_running "mexe-grafana"

echo ""
echo "[3/4] Frontend"

wait_for_ready \
    "Frontend" \
    "$FRONTEND_URL/" \
    60 \
    true

echo ""
echo "[4/4] Grafana"

wait_for_ready \
    "Grafana /api/health" \
    "$GRAFANA_URL/api/health" \
    180 \
    true

echo ""
echo "== SMOKE TEST PASSED =="
