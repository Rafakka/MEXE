import asyncio
import gc
import os
import threading
import time
from io import BytesIO
import struct
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
async def test_blend_capacity_concurrency_2(allow_capacity_candidate):
    width = 8192
    height = 8192

    allow_capacity_candidate(width, height)

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
        size=len(image_bytes),
        filename="capacity-test.png",
        headers=headers,
    )

@pytest.mark.parametrize("width,height", SIZES)
@pytest.mark.asyncio
async def test_blend_capacity_characterization(
    width,
    height,
    allow_capacity_candidate,
    capacity_image_samples,
):
    allow_capacity_candidate(width, height)

    service = ImageProcessingService()

    if capacity_image_samples is None:
        # Default: keep the existing synthetic test behavior.
        image_a_bytes = create_image_bytes(
            (width, height),
            (255, 0, 0, 255),
        )
        image_b_bytes = create_image_bytes(
            (width, height),
            (0, 0, 255, 255),
        )
        image_source = "synthetic"
        image_a_label = "generated"
        image_b_label = "generated"
    else:
        # Optional mode: read actual PNG samples from disk.
        image_a_bytes = capacity_image_samples["image_a"]["data"]
        image_b_bytes = capacity_image_samples["image_b"]["data"]

        image_source = "real"
        image_a_label = capacity_image_samples["image_a"]["path"]
        image_b_label = capacity_image_samples["image_b"]["path"]

    with Image.open(BytesIO(image_a_bytes)) as image_a_info:
        input_a_size = image_a_info.size
        input_a_format = image_a_info.format

    with Image.open(BytesIO(image_b_bytes)) as image_b_info:
        input_b_size = image_b_info.size
        input_b_format = image_b_info.format

    image_a = create_upload(image_a_bytes)
    image_b = create_upload(image_b_bytes)

    input_bytes_a = len(image_a_bytes)
    input_bytes_b = len(image_b_bytes)
    input_bytes = input_bytes_a + input_bytes_b

    estimated_three_rgba_buffers_bytes = (
        3 * width * height * 4
    )

    # 2. Registre a memória antes do processamento.

    process = psutil.Process(os.getpid())
    memory_before = process.memory_info().rss

    stop_event = threading.Event()
    memory_result = {}

    memory_monitor = threading.Thread(
        target=monitor_memory,
        args=(process, stop_event, memory_result),
        daemon=True,
    )

    output_size = 0
    output_header = bytearray()

    start = time.perf_counter()
    memory_monitor.start()

    chunk_count = 0
    small_chunk_count = 0
    min_chunk_bytes = None
    max_chunk_bytes = 0

    try:
        # Time spent until process_uploads returns the response.
        process_started = time.perf_counter()

        response = await service.process_uploads(
            image_a=image_a,
            image_b=image_b,
            width=width,
            height=height,
            request_id=f"capacity-{width}x{height}",
        )

        process_elapsed_ms = (
            time.perf_counter() - process_started
        ) * 1000

        # Time spent consuming the response body.
        consume_started = time.perf_counter()

        async for chunk in response.body_iterator:
            if isinstance(chunk, str):
                chunk = chunk.encode()
            elif not isinstance(chunk, bytes):
                raise TypeError(
                    f"Unexpected response chunk type: {type(chunk)}"
                )

            chunk_size = len(chunk)

            chunk_count += 1
            if chunk_size <= 1024:
                small_chunk_count += 1

            if min_chunk_bytes is None:
                min_chunk_bytes = chunk_size
            else:
                min_chunk_bytes = min(
                    min_chunk_bytes,
                    chunk_size,
                )

            max_chunk_bytes = max(
                max_chunk_bytes,
                chunk_size,
            )

            output_size += chunk_size

            if len(output_header) < 24:
                remaining = 24 - len(output_header)
                output_header.extend(chunk[:remaining])

        response_consumption_ms = (
            time.perf_counter() - consume_started
        ) * 1000

        elapsed_ms = (
            time.perf_counter() - start
        ) * 1000

    finally:
        stop_event.set()
        memory_monitor.join()

    memory_after = process.memory_info().rss
    memory_peak = memory_result["peak"]

    memory_delta_bytes = memory_after - memory_before
    memory_peak_delta_bytes = memory_peak - memory_before

    # Validate the PNG signature and output dimensions.
    assert output_size > 0
    assert len(output_header) >= 24
    assert bytes(output_header[:8]) == b"\x89PNG\r\n\x1a\n"

    output_width, output_height = struct.unpack(
        ">II",
        output_header[16:24],
    )

    assert (output_width, output_height) == (width, height)

    # 4. Dados comparáveis entre resoluções.
    mib = 1024 * 1024

    print(
        "\n"
        f"CAPACITY_CHARACTERIZATION | "
        f"size={width}x{height} | "
        f"pixels={width * height} | "
        f"source={image_source} | "
        f"input_a={input_a_size[0]}x{input_a_size[1]} "
        f"format_a={input_a_format} "
        f"bytes_a={input_bytes_a} | "
        f"input_b={input_b_size[0]}x{input_b_size[1]} "
        f"format_b={input_b_format} "
        f"bytes_b={input_bytes_b} | "
        f"input_bytes={input_bytes} | "
        f"estimated_three_rgba_buffers_mb="
        f"{estimated_three_rgba_buffers_bytes / mib:.2f} | "
        f"baseline_rss_mb={memory_before / mib:.2f} | "
        f"peak_rss_mb={memory_peak / mib:.2f} | "
        f"peak_delta_mb={memory_peak_delta_bytes / mib:.2f} | "
        f"final_delta_mb={memory_delta_bytes / mib:.2f} | "
        f"output_bytes={output_size} | "
        f"elapsed_ms={elapsed_ms:.2f} | "
        f"input_a_path={image_a_label} | "
        f"input_b_path={image_b_label}"
        f"service_elapsed_ms={process_elapsed_ms:.2f} | "
        f"response_consumption_ms={response_consumption_ms:.2f} | "
        f"response_chunks={chunk_count} | "
        f"small_chunks_le_1kb={small_chunk_count} | "
        f"min_chunk_bytes={min_chunk_bytes} | "
        f"max_chunk_bytes={max_chunk_bytes} | "
        f"avg_chunk_bytes="
        f"{output_size / chunk_count if chunk_count else 0:.1f} | "
    )

@pytest.mark.asyncio
async def test_capacity_memory_stability_repeated_real_images(
    allow_capacity_candidate,
    capacity_image_samples,
):
    if capacity_image_samples is None:
        pytest.skip(
            "Run with --capacity-images tests/imgs/within-limit"
        )

    width, height = 4096, 4096
    allow_capacity_candidate(width, height)

    image_a_bytes = capacity_image_samples["image_a"]["data"]
    image_b_bytes = capacity_image_samples["image_b"]["data"]

    process = psutil.Process(os.getpid())
    service = ImageProcessingService()

    mib = 1024 * 1024
    baseline_rss = process.memory_info().rss

    print(
        f"\nMEMORY_STABILITY | baseline_rss_mb="
        f"{baseline_rss / mib:.2f}"
    )

    output_sizes = []

    for iteration in range(1, 9):
        image_a = create_upload(image_a_bytes)
        image_b = create_upload(image_b_bytes)

        memory_before = process.memory_info().rss
        stop_event = threading.Event()
        memory_result = {}

        monitor = threading.Thread(
            target=monitor_memory,
            args=(process, stop_event, memory_result),
            daemon=True,
        )

        response = None
        output_size = 0
        output_header = bytearray()

        monitor.start()

        try:
            response = await service.process_uploads(
                image_a=image_a,
                image_b=image_b,
                width=width,
                height=height,
                request_id=f"memory-stability-{iteration}",
            )

            async for chunk in response.body_iterator:
                if isinstance(chunk, str):
                    chunk = chunk.encode()
                elif not isinstance(chunk, bytes):
                    raise TypeError(
                        f"Unexpected response chunk type: "
                        f"{type(chunk)}"
                    )

                output_size += len(chunk)

                if len(output_header) < 24:
                    remaining = 24 - len(output_header)
                    output_header.extend(chunk[:remaining])

            assert output_size > 0
            assert bytes(output_header[:8]) == (
                b"\x89PNG\r\n\x1a\n"
            )

            output_width, output_height = struct.unpack(
                ">II",
                output_header[16:24],
            )
            assert (output_width, output_height) == (
                width,
                height,
            )

        finally:
            stop_event.set()
            monitor.join()

        peak_rss = memory_result.get(
            "peak",
            process.memory_info().rss,
        )

        output_sizes.append(output_size)

        # Release references before measuring retained RSS.
        del response, image_a, image_b, output_header, chunk
        gc.collect()

        rss_after = process.memory_info().rss

        print(
            f"MEMORY_STABILITY | iteration={iteration} | "
            f"output_mb={output_size / mib:.2f} | "
            f"rss_before_mb={memory_before / mib:.2f} | "
            f"rss_peak_mb={peak_rss / mib:.2f} | "
            f"rss_after_mb={rss_after / mib:.2f} | "
            f"retained_delta_mb="
            f"{(rss_after - baseline_rss) / mib:.2f}"
        )

    assert len(set(output_sizes)) == 1
