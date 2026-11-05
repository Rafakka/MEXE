
import time

import logging

from app.observability.metrics import metrics
from app.observability.context import operation_context
from app.observability.decorators import measure_time

from collections.abc import Iterator
from starlette.concurrency import run_in_threadpool

from PIL import Image
from io import BytesIO
from fastapi.responses import StreamingResponse
from app.core.settings import MEDIA_TYPES

logger = logging.getLogger("mexe")

def _save_png(
    image: Image.Image,
    output: BytesIO,
    operation: str,
) -> None:
    started = time.perf_counter()

    try:
        image.save(output, format="PNG", compress_level=1,)
    finally:
        metrics.observe(
            "mexe_processing_duration_seconds",
            time.perf_counter() - started,
            labels={
                "operation": operation,
                "stage": "encode_save",
            },
        )

def iter_image_chunks(
    buffer: BytesIO,
    chunk_size: int = 256 * 1024,
    operation: str = "unknown",
) -> Iterator[bytes]:

    started = time.perf_counter()

    try:
        while True:
            chunk = buffer.read(chunk_size)

            if not chunk:
                break

            yield chunk

    finally:
        metrics.observe(
            "mexe_processing_duration_seconds",
            time.perf_counter() - started,
            labels={
                "operation": operation,
                "stage": "encode_stream",
            },
        )

class ImageEncoder:

    @measure_time("mexe_processing_duration_seconds", stage="encode")
    async def encode(
            self,
            image:Image.Image,
            ) -> StreamingResponse :

        logger.info(
                "Enconding image (%dx%d)",
                image.width,
                image.height,
                )

        operation = operation_context.get() or "unknown"

        output = BytesIO()

        await run_in_threadpool(
            _save_png,
            image,
            output,
            operation,
        )

        output.seek(0)

        logger.info(
                "Imaged Encoded succefully(%dx%d)",
                image.width,
                image.height
                )


        response = StreamingResponse (
                iter_image_chunks(output, operation=operation),
                media_type=MEDIA_TYPES["PNG"]
                )

        return response
