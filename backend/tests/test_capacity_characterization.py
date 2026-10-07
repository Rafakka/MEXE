import asyncio
import os
import threading
import time
from io import BytesIO

import psutil
import pytest
from fastapi import UploadFile
from PIL import Image
from starlette.datastructures import Headers

from app.services.image_processing_service import ImageProcessingService


async def run_blend(
    service,
    image_a,
    image_b,
    width,
    height,
    request_id,
):
    response = await service.process_uploads(
        image_a=image_a,
        image_b=image_b,
        width=width,
        height=height,
        request_id=request_id,
    )

    output_body = bytearray()

    async for chunk in response.body_iterator:
        if isinstance(chunk, bytes):
            output_body.extend(chunk)
        elif isinstance(chunk, str):
            output_body.extend(chunk.encode())
        else:
            raise TypeError(
                f"Unexpected chunk type: {type(chunk)}"
            )

    return bytes(output_body)


@pytest.mark.asyncio
async def test_blend_capacity_concurrency_2():
    width = 8192
    height = 8192

    process = psutil.Process(os.getpid())
    memory_before = process.memory_info().rss

    service = ImageProcessingService()

    # Operation A
    image_a_1_bytes = create_image_bytes(
        (width, height),
        (255, 0, 0, 255),
    )
    image_b_1_bytes = create_image_bytes(
        (width, height),
        (0, 0, 255, 255),
    )

    # Operation B
    image_a_2_bytes = create_image_bytes(
        (width, height),
        (255, 0, 0, 255),
    )
    image_b_2_bytes = create_image_bytes(
        (width, height),
        (0, 0, 255, 255),
    )

    image_a_1 = create_upload(image_a_1_bytes)
    image_b_1 = create_upload(image_b_1_bytes)

    image_a_2 = create_upload(image_a_2_bytes)
    image_b_2 = create_upload(image_b_2_bytes)

    stop_event = threading.Event()
    memory_result = {}

    memory_monitor = threading.Thread(
        target=monitor_memory,
        args=(process, stop_event, memory_result),
        daemon=True,
    )

    memory_monitor.start()

    start = time.perf_counter()

    output_a, output_b = await asyncio.gather(
        run_blend(
            service,
            image_a_1,
            image_b_1,
            width,
            height,
            "capacity-concurrent-a",
        ),
        run_blend(
            service,
            image_a_2,
            image_b_2,
            width,
            height,
            "capacity-concurrent-b",
        ),
    )

    elapsed_ms = (time.perf_counter() - start) * 1000

    stop_event.set()
    memory_monitor.join()

    memory_peak = memory_result["peak"]
    memory_delta = process.memory_info().rss - memory_before
    memory_peak_delta = memory_peak - memory_before

    # Both operations must have produced valid output.
    assert output_a
    assert output_b

    with Image.open(BytesIO(output_a)) as output_image_a:
        assert output_image_a.size == (width, height)
        assert output_image_a.format == "PNG"

    with Image.open(BytesIO(output_b)) as output_image_b:
        assert output_image_b.size == (width, height)
        assert output_image_b.format == "PNG"

    print(
        "\n"
        f"CAPACITY_CONCURRENCY | "
        f"size={width}x{height} | "
        f"concurrency=2 | "
        f"memory_delta_bytes={memory_delta} | "
        f"memory_peak_delta_bytes={memory_peak_delta} | "
        f"output_a_bytes={len(output_a)} | "
        f"output_b_bytes={len(output_b)} | "
        f"elapsed_ms={elapsed_ms:.2f}"
    )

SIZES = [
    (256, 256),
    (512, 512),
    (1024, 1024),
    (2048, 2048),
    (4096, 4096),
    (6144, 6144),
    (8192, 8192),
    (10240, 10240),
    (12288, 12288),
]


def create_image_bytes(
    size: tuple[int, int],
    color: tuple[int, int, int, int],
) -> bytes:
    image = Image.new("RGBA", size, color)

    buffer = BytesIO()
    image.save(buffer, format="PNG")

    return buffer.getvalue()

def monitor_memory(process, stop_event, result):
    peak = process.memory_info().rss

    while not stop_event.is_set():
        current = process.memory_info().rss

        if current > peak:
            peak = current

        time.sleep(0.001)

    result["peak"] = max(
        peak,
        process.memory_info().rss,
    )

def create_upload(image_bytes: bytes):
    buffer = BytesIO(image_bytes)

    headers = Headers(
        {
            "content-type": "image/png",
        }
    )

    return UploadFile(
        file=buffer,
        filename="capacity-test.png",
        headers=headers,
    )


@pytest.mark.parametrize("width,height", SIZES)
@pytest.mark.asyncio
async def test_blend_capacity_characterization(
    width,
    height,
):
    process = psutil.Process(os.getpid())

    memory_before = process.memory_info().rss

    stop_event = threading.Event()
    memory_result = {}

    memory_monitor = threading.Thread(
        target=monitor_memory,
        args=(process, stop_event, memory_result),
        daemon=True,
    )

    memory_monitor.start()

    service = ImageProcessingService()

    image_a_bytes = create_image_bytes(
        (width, height),
        (255, 0, 0, 255),
    )

    image_b_bytes = create_image_bytes(
        (width, height),
        (0, 0, 255, 255),
    )

    # Third image kept alive to model the expected
    # memory footprint of three decoded RGBA images.
    image_c_bytes = create_image_bytes(
        (width, height),
        (0, 255, 0, 255),
    )

    image_a = create_upload(image_a_bytes)
    image_b = create_upload(image_b_bytes)
    image_c = Image.open(BytesIO(image_c_bytes)).convert("RGBA")

    input_bytes = (
        len(image_a_bytes)
        + len(image_b_bytes)
        + len(image_c_bytes)
    )

    estimated_memory_bytes = (
        3
        * width
        * height
        * 4
    )

    start = time.perf_counter()

    response = await service.process_uploads(
        image_a=image_a,
        image_b=image_b,
        width=width,
        height=height,
        request_id=f"capacity-{width}x{height}",
    )

    elapsed_ms = (time.perf_counter() - start) * 1000

    output_body = bytearray()

    async for chunk in response.body_iterator:
        if isinstance(chunk, bytes):
            output_body.extend(chunk)
        elif isinstance(chunk, str):
            output_body.extend(chunk.encode())
        else:
            raise TypeError(
                f"Unexpected response chunk type: {type(chunk).__name__}"
            )

    output_body = bytes(output_body)

    memory_after = process.memory_info().rss

    stop_event.set()
    memory_monitor.join()

    memory_peak = memory_result["peak"]
    memory_delta = memory_after - memory_before
    memory_peak_delta = memory_peak - memory_before

    memory_after = process.memory_info().rss
    memory_delta = memory_after - memory_before

    assert output_body

    with Image.open(BytesIO(output_body)) as output_image:
        assert output_image.size == (width, height)
        assert output_image.format == "PNG"

    print(
        "\n"
        f"CAPACITY | "
        f"size={width}x{height} | "
        f"pixels={width * height} | "
        f"input_bytes={input_bytes} | "
        f"estimated_memory_bytes={estimated_memory_bytes} | "
        f"memory_delta_bytes={memory_delta} | "
        f"memory_peak_delta_bytes={memory_peak_delta} | "
        f"output_bytes={len(output_body)} | "
        f"elapsed_ms={elapsed_ms:.2f}"
    )

    image_c.close()
