import statistics
import time
from io import BytesIO

import pytest
from fastapi import UploadFile
from PIL import Image
from starlette.concurrency import run_in_threadpool
from starlette.datastructures import Headers

from app.services.image_processing_service import ImageProcessingService


OUTPUT_SIZE = (4096, 4096)
COMPRESSION_LEVELS = (0, 1, 6)
REPETITIONS = 3
DEFAULT_COMPRESSION_LEVEL = 6


def create_upload(image_bytes: bytes, filename: str) -> UploadFile:
    """Build an UploadFile using the same structure as capacity tests."""
    return UploadFile(
        file=BytesIO(image_bytes),
        size=len(image_bytes),
        filename=filename,
        headers=Headers({"content-type": "image/png"}),
    )


async def consume_response(response) -> bytes:
    """Consume the StreamingResponse returned by ImageProcessingService."""
    body = bytearray()

    async for chunk in response.body_iterator:
        if isinstance(chunk, str):
            body.extend(chunk.encode())
        elif isinstance(chunk, bytes):
            body.extend(chunk)
        else:
            raise TypeError(f"Unexpected response chunk type: {type(chunk)}")

    return bytes(body)


def save_png_at_level(
    image: Image.Image,
    output: BytesIO,
    compression_level: int,
) -> float:
    """Save one PNG and return only the time spent inside Image.save()."""
    started = time.perf_counter()
    image.save(
        output,
        format="PNG",
        compress_level=compression_level,
    )
    return (time.perf_counter() - started) * 1000


def assert_same_png_pixels(encoded_bytes: bytes, reference: Image.Image) -> None:
    """Verify dimensions and lossless pixel equality, outside the timed section."""
    with Image.open(BytesIO(encoded_bytes)) as encoded_image:
        encoded_image.load()

        assert encoded_image.format == "PNG"
        assert encoded_image.size == OUTPUT_SIZE
        assert encoded_image.convert("RGBA").tobytes() == reference.tobytes()


@pytest.mark.asyncio
async def test_png_compression_benchmark(
    allow_capacity_candidate,
    capacity_image_samples,
):
    """Compare PNG compression levels against the same real 4096x4096 blend."""
    if capacity_image_samples is None:
        pytest.skip(
            "Run with --capacity-images tests/imgs/within-limit"
        )

    width, height = OUTPUT_SIZE
    allow_capacity_candidate(width, height)

    # Create the reference image through the existing M.E.X.E. processing path.
    service = ImageProcessingService()
    source_started = time.perf_counter()

    response = await service.process_uploads(
        image_a=create_upload(
            capacity_image_samples["image_a"]["data"],
            "image-a.png",
        ),
        image_b=create_upload(
            capacity_image_samples["image_b"]["data"],
            "image-b.png",
        ),
        width=width,
        height=height,
        request_id="png-compression-benchmark-source",
    )

    reference_png = await consume_response(response)

    with Image.open(BytesIO(reference_png)) as generated_image:
        generated_image.load()
        assert generated_image.format == "PNG"
        assert generated_image.size == OUTPUT_SIZE
        source_image = generated_image.convert("RGBA").copy()

    source_generation_ms = (time.perf_counter() - source_started) * 1000

    # Keep measurements separate by level. Rotate the order on each repetition
    # so one level does not always benefit from being executed last.
    measurements = {
        level: {"elapsed_ms": [], "output_bytes": []}
        for level in COMPRESSION_LEVELS
    }
    verified_levels = set()

    for repetition in range(REPETITIONS):
        offset = repetition % len(COMPRESSION_LEVELS)
        run_order = COMPRESSION_LEVELS[offset:] + COMPRESSION_LEVELS[:offset]

        for level in run_order:
            output = BytesIO()
            elapsed_ms = await run_in_threadpool(
                save_png_at_level,
                source_image,
                output,
                level,
            )
            encoded_bytes = output.getvalue()

            assert encoded_bytes, f"No output produced at compression level {level}"

            # Validate each level once; validation is intentionally outside timing.
            if level not in verified_levels:
                assert_same_png_pixels(encoded_bytes, source_image)
                verified_levels.add(level)

            measurements[level]["elapsed_ms"].append(elapsed_ms)
            measurements[level]["output_bytes"].append(len(encoded_bytes))

    baseline_time_ms = statistics.median(
        measurements[DEFAULT_COMPRESSION_LEVEL]["elapsed_ms"]
    )
    baseline_size_bytes = measurements[DEFAULT_COMPRESSION_LEVEL]["output_bytes"][0]

    print("\nPNG_COMPRESSION_BENCHMARK")
    print(
        f"source_size={width}x{height} | "
        f"source_generation_ms={source_generation_ms:.2f} | "
        f"repetitions={REPETITIONS} | "
        f"baseline_level={DEFAULT_COMPRESSION_LEVEL}"
    )

    for level in COMPRESSION_LEVELS:
        elapsed_values = measurements[level]["elapsed_ms"]
        output_sizes = measurements[level]["output_bytes"]

        # A fixed input and encoder configuration should produce fixed byte size.
        assert len(set(output_sizes)) == 1

        median_time_ms = statistics.median(elapsed_values)
        output_size_bytes = output_sizes[0]
        time_delta_pct = (
            (median_time_ms - baseline_time_ms) / baseline_time_ms
        ) * 100
        size_delta_pct = (
            (output_size_bytes - baseline_size_bytes) / baseline_size_bytes
        ) * 100

        print(
            f"level={level} | "
            f"median_save_ms={median_time_ms:.2f} | "
            f"min_save_ms={min(elapsed_values):.2f} | "
            f"output_bytes={output_size_bytes} | "
            f"output_mib={output_size_bytes / (1024 * 1024):.2f} | "
            f"time_vs_level_6_pct={time_delta_pct:+.2f}% | "
            f"size_vs_level_6_pct={size_delta_pct:+.2f}%"
        )
