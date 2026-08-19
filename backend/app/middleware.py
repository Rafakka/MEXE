import logging
import time
import uuid

from fastapi import Request
from pythonjsonlogger.json import JsonFormatter

from app.observability.context import (
        request_id_context,
        operation_context,
        )

logger = logging.getLogger("mexe")
logger.setLevel(logging.INFO)

handler = logging.StreamHandler()

formatter = JsonFormatter(
    "%(asctime)s %(levelname)s %(name)s %(message)s"
)

handler.setFormatter(formatter)

if not logger.handlers:
    logger.addHandler(handler)


async def request_observability_middleware(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())

    request.state.request_id = request_id

    request_id_context.set(request_id)

    operation = request.url.path.removeprefix("/")

    operation_context.set(operation)

    logger.info(
    "request_context",
    extra={
        "request_id": request_id_context.get(),
        "operation": operation_context.get(),
        },
    )

    start = time.perf_counter()

    try:
        response = await call_next(request)
    except Exception:
        duration_ms = (time.perf_counter() - start) * 1000

        logger.exception(
            "request_failed",
            extra={
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "duration_ms": round(duration_ms, 2),
            },
        )

        raise

    duration_ms = (time.perf_counter() - start) * 1000

    response.headers["X-Request-ID"] = request_id

    logger.info(
        "request_completed",
        extra={
            "request_id": request_id,
            "method": request.method,
            "path": request.url.path,
            "status_code": response.status_code,
            "duration_ms": round(duration_ms, 2),
        },
    )

    return response
