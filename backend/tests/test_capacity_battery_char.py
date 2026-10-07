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


SIZE = (8192, 8192)


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
        filename="capacity-test.png",
        headers=headers,
    )


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


async def run_blend_timed(
    service,
    image_a,
    image_b,
    width,
    height,
    request_id,
    timeline,
    start_time,
):
    timeline.append(
        (
            request_id,
            "START",
            time.perf_counter() - start_time,
        )
    )

    output = await run_blend(
        service,
        image_a,
        image_b,
        width,
        height,
        request_id,
    )

    timeline.append(
        (
            request_id,
            "END",
            time.perf_counter() - start_time,
        )
    )

    return output


def create_operation_inputs():
    image_a_bytes = create_image_bytes(
        SIZE,
        (255, 0, 0, 255),
    )

    image_b_bytes = create_image_bytes(
        SIZE,
        (0, 0, 255, 255),
    )

    return (
        create_upload(image_a_bytes),
        create_upload(image_b_bytes),
    )


def validate_output(output, width, height):
    assert output

    with Image.open(BytesIO(output)) as image:
        assert image.size == (width, height)
        assert image.format == "PNG"


@pytest.mark.asyncio
async def test_capacity_comparison():
    width, height = SIZE

    service = ImageProcessingService()
    process = psutil.Process(os.getpid())

    # ---------------------------------------------------------
    # 1. BASELINE — uma operação
    # ---------------------------------------------------------

    image_a, image_b = create_operation_inputs()

    memory_before = process.memory_info().rss

    stop_event = threading.Event()
    memory_result = {}

    monitor = threading.Thread(
        target=monitor_memory,
        args=(process, stop_event, memory_result),
        daemon=True,
    )

    monitor.start()

    start = time.perf_counter()

    output = await run_blend(
        service,
        image_a,
        image_b,
        width,
        height,
        "capacity-baseline",
    )

    elapsed_baseline = (
        time.perf_counter() - start
    ) * 1000

    stop_event.set()
    monitor.join()

    memory_peak_baseline = (
        memory_result["peak"] - memory_before
    )

    validate_output(output, width, height)

    print(
        "\n"
        f"CAPACITY_BASELINE | "
        f"size={width}x{height} | "
        f"operations=1 | "
        f"memory_peak_delta_bytes="
        f"{memory_peak_baseline} | "
        f"elapsed_ms="
        f"{elapsed_baseline:.2f}"
    )

    # ---------------------------------------------------------
    # 2. SEQUENCIAL — duas operações, uma após a outra
    # ---------------------------------------------------------

    image_a_1, image_b_1 = create_operation_inputs()
    image_a_2, image_b_2 = create_operation_inputs()

    memory_before = process.memory_info().rss

    stop_event = threading.Event()
    memory_result = {}

    monitor = threading.Thread(
        target=monitor_memory,
        args=(process, stop_event, memory_result),
        daemon=True,
    )

    monitor.start()

    start = time.perf_counter()

    output_1 = await run_blend(
        service,
        image_a_1,
        image_b_1,
        width,
        height,
        "capacity-sequential-a",
    )

    output_2 = await run_blend(
        service,
        image_a_2,
        image_b_2,
        width,
        height,
        "capacity-sequential-b",
    )

    elapsed_sequential = (
        time.perf_counter() - start
    ) * 1000

    stop_event.set()
    monitor.join()

    memory_peak_sequential = (
        memory_result["peak"] - memory_before
    )

    validate_output(output_1, width, height)
    validate_output(output_2, width, height)

    print(
        "\n"
        f"CAPACITY_SEQUENTIAL | "
        f"size={width}x{height} | "
        f"operations=2 | "
        f"memory_peak_delta_bytes="
        f"{memory_peak_sequential} | "
        f"elapsed_ms="
        f"{elapsed_sequential:.2f}"
    )

    # ---------------------------------------------------------
    # 3. CONCORRENTE — duas operações simultâneas
    # ---------------------------------------------------------

    image_a_1, image_b_1 = create_operation_inputs()
    image_a_2, image_b_2 = create_operation_inputs()

    memory_before = process.memory_info().rss

    stop_event = threading.Event()
    memory_result = {}

    monitor = threading.Thread(
        target=monitor_memory,
        args=(process, stop_event, memory_result),
        daemon=True,
    )

    monitor.start()

    start = time.perf_counter()

    output_1, output_2 = await asyncio.gather(
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

    elapsed_concurrent = (
        time.perf_counter() - start
    ) * 1000

    stop_event.set()
    monitor.join()

    memory_peak_concurrent = (
        memory_result["peak"] - memory_before
    )

    validate_output(output_1, width, height)
    validate_output(output_2, width, height)

    print(
        "\n"
        f"CAPACITY_CONCURRENT | "
        f"size={width}x{height} | "
        f"operations=2 | "
        f"memory_peak_delta_bytes="
        f"{memory_peak_concurrent} | "
        f"elapsed_ms="
        f"{elapsed_concurrent:.2f}"
    )

@pytest.mark.asyncio
async def test_capacity_concurrency_3():
    width, height = SIZE

    service = ImageProcessingService()
    process = psutil.Process(os.getpid())

    # ---------------------------------------------------------
    # 3 operações independentes
    # ---------------------------------------------------------

    image_a_1, image_b_1 = create_operation_inputs()
    image_a_2, image_b_2 = create_operation_inputs()
    image_a_3, image_b_3 = create_operation_inputs()

    memory_before = process.memory_info().rss

    stop_event = threading.Event()
    memory_result = {}

    monitor = threading.Thread(
        target=monitor_memory,
        args=(process, stop_event, memory_result),
        daemon=True,
    )

    monitor.start()

    start = time.perf_counter()

    output_1, output_2, output_3 = await asyncio.gather(
        run_blend(
            service,
            image_a_1,
            image_b_1,
            width,
            height,
            "capacity-concurrent-3-a",
        ),
        run_blend(
            service,
            image_a_2,
            image_b_2,
            width,
            height,
            "capacity-concurrent-3-b",
        ),
        run_blend(
            service,
            image_a_3,
            image_b_3,
            width,
            height,
            "capacity-concurrent-3-c",
        ),
    )

    elapsed_ms = (
        time.perf_counter() - start
    ) * 1000

    stop_event.set()
    monitor.join()

    memory_peak_delta = (
        memory_result["peak"] - memory_before
    )

    # ---------------------------------------------------------
    # Validar as três operações
    # ---------------------------------------------------------

    validate_output(
        output_1,
        width,
        height,
    )

    validate_output(
        output_2,
        width,
        height,
    )

    validate_output(
        output_3,
        width,
        height,
    )

    print(
        "\n"
        f"CAPACITY_CONCURRENT | "
        f"size={width}x{height} | "
        f"operations=3 | "
        f"memory_peak_delta_bytes="
        f"{memory_peak_delta} | "
        f"output_1_bytes={len(output_1)} | "
        f"output_2_bytes={len(output_2)} | "
        f"output_3_bytes={len(output_3)} | "
        f"elapsed_ms={elapsed_ms:.2f}"
    )

@pytest.mark.asyncio
async def test_capacity_concurrency_timeline():
    width, height = SIZE

    service = ImageProcessingService()

    image_a_1, image_b_1 = create_operation_inputs()
    image_a_2, image_b_2 = create_operation_inputs()
    image_a_3, image_b_3 = create_operation_inputs()

    timeline = []

    start_time = time.perf_counter()

    output_1, output_2, output_3 = await asyncio.gather(
        run_blend_timed(
            service,
            image_a_1,
            image_b_1,
            width,
            height,
            "A",
            timeline,
            start_time,
        ),
        run_blend_timed(
            service,
            image_a_2,
            image_b_2,
            width,
            height,
            "B",
            timeline,
            start_time,
        ),
        run_blend_timed(
            service,
            image_a_3,
            image_b_3,
            width,
            height,
            "C",
            timeline,
            start_time,
        ),
    )

    validate_output(output_1, width, height)
    validate_output(output_2, width, height)
    validate_output(output_3, width, height)

    print("\nCAPACITY_TIMELINE")

    for request_id, event, elapsed in timeline:
        print(
            f"{event:5} | "
            f"operation={request_id} | "
            f"elapsed_ms={elapsed * 1000:.2f}"
        )


def monitor_resources(process, stop_event, samples):
    process.cpu_percent(interval=None)

    start = time.perf_counter()

    while not stop_event.is_set():
        elapsed_ms = (
            time.perf_counter() - start
        ) * 1000

        rss = process.memory_info().rss
        cpu = process.cpu_percent(interval=None)

        samples.append(
            (
                elapsed_ms,
                cpu,
                rss,
            )
        )

        time.sleep(0.01)

@pytest.mark.asyncio
async def test_capacity_concurrency_diagnostics():
    width, height = SIZE

    service = ImageProcessingService()
    process = psutil.Process(os.getpid())

    image_a_1, image_b_1 = create_operation_inputs()
    image_a_2, image_b_2 = create_operation_inputs()
    image_a_3, image_b_3 = create_operation_inputs()

    samples = []

    stop_event = threading.Event()

    monitor = threading.Thread(
        target=monitor_resources,
        args=(
            process,
            stop_event,
            samples,
        ),
        daemon=True,
    )

    monitor.start()

    start = time.perf_counter()

    outputs = await asyncio.gather(
        run_blend(
            service,
            image_a_1,
            image_b_1,
            width,
            height,
            "diagnostic-a",
        ),
        run_blend(
            service,
            image_a_2,
            image_b_2,
            width,
            height,
            "diagnostic-b",
        ),
        run_blend(
            service,
            image_a_3,
            image_b_3,
            width,
            height,
            "diagnostic-c",
        ),
    )

    elapsed_ms = (
        time.perf_counter() - start
    ) * 1000

    stop_event.set()
    monitor.join()

    for output in outputs:
        validate_output(
            output,
            width,
            height,
        )

    print("\nCAPACITY_DIAGNOSTICS")
    print(
        f"total_elapsed_ms={elapsed_ms:.2f}"
    )

    print(
        "elapsed_ms | cpu_percent | rss_mb"
    )

    for elapsed, cpu, rss in samples[::10]:
        print(
            f"{elapsed:10.2f} | "
            f"{cpu:11.2f} | "
            f"{rss / (1024 * 1024):7.2f}"
        )

    cpu_values = [
        cpu
        for _, cpu, _ in samples
        ]

    rss_values = [
        rss
        for _, _, rss in samples
        ]

    print(
    f"cpu_avg={sum(cpu_values) / len(cpu_values):.2f}%"
    )

    print(
    f"cpu_max={max(cpu_values):.2f}%"
    )

    print(
    f"rss_max_mb="
    f"{max(rss_values) / (1024 * 1024):.2f}"
    )


