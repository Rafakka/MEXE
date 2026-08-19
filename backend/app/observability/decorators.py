import inspect
import functools
import time

import logging

from app.observability.metrics import metrics
from app.observability.context import operation_context

logger = logging.getLogger("mexe")

def measure_time(metric_name):

    def decorator(func):

        if inspect.iscoroutinefunction(func):

            @functools.wraps(func)
            async def async_wrapper(*args, **kwargs):
                start = time.perf_counter()

                try:
                    return await func(*args, **kwargs)

                finally:
                    duration_seconds = time.perf_counter() - start
                    operation = operation_context.get()

                    logger.info(
                        "metric_context",
                        extra={
                        "operation": operation,
                        },
                    )
                    metrics.observe(
                        metric_name,
                        duration_seconds,
                    )

            return async_wrapper

        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            start = time.perf_counter()

            try:
                return func(*args, **kwargs)

            finally:
                duration_seconds = time.perf_counter() - start
                operation = operation_context.get()

                logger.info(
                        "metric_context",
                        extra={
                        "operation": operation,
                        },
                    )


                metrics.observe(
                    metric_name,
                    duration_seconds,
                )

        return wrapper

    return decorator
