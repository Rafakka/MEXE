

import re
from io import BytesIO

import pytest
from fastapi import UploadFile
from PIL import Image
from starlette.datastructures import Headers

from app.observability.metrics import metrics
from app.services.image_processing_service import ImageProcessingService


SIZES = [
    (1024, 1024),
    (2048, 2048),
    (4096, 4096),
    (6144, 6144),
    (8192, 8192),
]

def create_image_bytes(size, color):
    image = Image.new("RGBA", size, color)
    buffer = BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()


def create_upload(image_bytes):
    buffer = BytesIO(image_bytes)

    headers = Headers({
        "content-type": "image/png"
    })

    return UploadFile(
        file=buffer,
        filename="capacity-telemetry.png",
        headers=headers,
    )

def get_metrics_snapshot():
    return metrics.prometheus_snapshot()

def extract_stage_metrics(snapshot):
    result = {}

    pattern = re.compile(
        r'mexe_processing_duration_seconds_(sum|count)'
        r'\{([^}]*)\}\s+([0-9.eE+-]+)'
    )

    for match in pattern.finditer(snapshot):
        metric_type = match.group(1)
        labels = match.group(2)
        value = float(match.group(3))

        stage_match = re.search(
            r'stage="([^"]+)"',
            labels,
        )

        if not stage_match:
            continue

        stage = stage_match.group(1)

        result.setdefault(stage, {})
        result[stage][metric_type] = value

    return result

def calculate_delta(before, after):
    stages = set(before) | set(after)

    result = {}

    for stage in stages:
        before_stage = before.get(stage, {})
        after_stage = after.get(stage, {})

        before_sum = before_stage.get("sum", 0.0)
        after_sum = after_stage.get("sum", 0.0)

        before_count = before_stage.get("count", 0.0)
        after_count = after_stage.get("count", 0.0)

        delta_sum = after_sum - before_sum
        delta_count = after_count - before_count

        result[stage] = {
            "count": delta_count,
            "total_ms": delta_sum * 1000,
            "avg_ms": (
                delta_sum / delta_count * 1000
                if delta_count
                else 0
            ),
        }

    return result

async def run_operation(service, size, request_id):
    image_a = create_image_bytes(size, "red")
    image_b = create_image_bytes(size, "blue")

    upload_a = create_upload(image_a)
    upload_b = create_upload(image_b)

    response = await service.process_uploads(
        upload_a,
        upload_b,
        size[0],
        size[1],
        request_id,
    )

    body = b""

    async for chunk in response.body_iterator:
        body += chunk

    assert body

    Image.open(BytesIO(body)).verify()

@pytest.mark.asyncio
@pytest.mark.parametrize("size", SIZES)
async def test_capacity_telemetry(size):
    service = ImageProcessingService()

    before_snapshot = get_metrics_snapshot()
    before = extract_stage_metrics(before_snapshot)

    await run_operation(
        service,
        size,
        f"capacity-telemetry-{size[0]}",
    )

    after_snapshot = get_metrics_snapshot()
    after = extract_stage_metrics(after_snapshot)

    delta = calculate_delta(before, after)

    print()
    print("CAPACITY_TELEMETRY")
    print(f"size={size[0]}x{size[1]}")

    for stage, values in sorted(delta.items()):
        if values["count"] <= 0:
            continue

        print(
            f"{stage:10} "
            f"count={values['count']:.0f} "
            f"total_ms={values['total_ms']:.2f} "
            f"avg_ms={values['avg_ms']:.2f}"
        )

    print("\n=== RAW METRICS ===")

    for line in after_snapshot.splitlines():
        if "mexe_processing_duration_seconds" in line:
            print(line)
