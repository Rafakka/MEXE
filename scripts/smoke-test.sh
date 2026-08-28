#!/bin/sh

set -e

echo "== MEXE Smoke Test v3 =="

wait_for_service() {
    SERVICE="$1"
    URL="$2"

    echo "Waiting for $SERVICE..."

    for i in $(seq 1 30); do
        if docker run --rm \
            --network "$NETWORK" \
            curlimages/curl:latest \
            -fsS "$URL" \
            >/dev/null 2>&1
        then
            echo "$SERVICE is ready."
            return 0
        fi

        sleep 1
    done

    echo "ERROR: $SERVICE did not become ready."
    return 1
}

echo ""
echo "[1/6] Backend"

    wait_for_backend() {
    echo "Waiting for backend..."

    for i in $(seq 1 30); do
        if docker compose exec -T backend \
            python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" \
            >/dev/null 2>&1
        then
            echo "Backend is ready."
            return 0
        fi

        sleep 1
    done

    echo "ERROR: Backend did not become ready."
    docker compose logs backend
    return 1
    }

    wait_for_backend

docker compose exec -T backend \
    python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"

echo ""
echo "[2/6] Prometheus"

wait_for_service "Prometheus" "http://prometheus:9090/-/ready"

echo ""
echo "[3/6] Loki"

wait_for_service "Loki" "http://loki:3100/ready"

echo ""
echo "[4/6] Grafana"

wait_for_service "Grafana" "http://grafana:3000/api/health"

echo ""
echo "[5/6] Frontend"

wait_for_service "Frontend" "http://frontend:80"

echo ""
echo "[6/6] Blend API"

NETWORK=$(docker inspect mexe-backend \
  --format '{{range $key, $value := .NetworkSettings.Networks}}{{$key}}{{end}}')

OUTPUT_DIR=$(mktemp -d)
RESULT_PATH="$OUTPUT_DIR/result.png"

docker run --rm \
  --network "$NETWORK" \
  -v "$(pwd)/tests/fixtures:/fixtures:ro" \
  -v "$OUTPUT_DIR:/output" \
  curlimages/curl:latest \
  -f \
  -X POST http://mexe-backend:8000/blend \
  -H "X-Request-ID: smoke-test-v3" \
  -F "implicit_image_a=@/fixtures/image-a.png" \
  -F "implicit_image_b=@/fixtures/image-b.png" \
  -F "width=1024" \
  -F "height=1024" \
  -o /output/result.png \
  -w "HTTP_STATUS=%{http_code}\nCONTENT_TYPE=%{content_type}\nSIZE=%{size_download}\n"

if [ ! -s "$RESULT_PATH" ]; then
    echo "ERROR: Blend did not produce a valid output file"
    rm -rf "$OUTPUT_DIR"
    exit 1
fi

echo "Blend result: $(stat -c%s "$RESULT_PATH") bytes"

docker cp "$RESULT_PATH" mexe-backend:/tmp/result.png

docker cp scripts/validate-image.py \
  mexe-backend:/tmp/validate-image.py

docker exec mexe-backend \
  python /tmp/validate-image.py /tmp/result.png

rm -rf "$OUTPUT_DIR"

echo ""
echo "== SMOKE TEST PASSED =="
