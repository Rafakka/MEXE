import inspect
import functools
import time

from app.observability.metrics import metrics
from app.observability.context import operation_context

def measure_time(metric_name, stage: str):

    def decorator(func):

        if inspect.iscoroutinefunction(func):

            @functools.wraps(func)
            async def async_wrapper(*args, **kwargs):
                start = time.perf_counter()
                operation = operation_context.get()

                try:
                    result = await func(*args, **kwargs)

                    if operation is not None:
                        metrics.increment(
                        "mexe_operations_total",
                        {
                            "operation": operation,
                            "status": "success",
                        },
                    )

                    return result

                except Exception:
                    if operation is not None:
                        metrics.increment(
                            "mexe_operations_total",
                            {
                                "operation": operation,
                                "status": "error",
                            },
                        )
                    raise

                finally:
                    duration_seconds = time.perf_counter() - start

                    labels = {
                        "stage": stage,
                    }

                    if operation is not None:
                        labels["operation"] = operation

                    metrics.observe(
                        metric_name,
                        duration_seconds,
                        labels=labels,
                        )

            return async_wrapper

        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            start = time.perf_counter()
            operation = operation_context.get()

            try:
                result = func(*args, **kwargs)

                if operation is not None:
                    metrics.increment(
                            "mexe_operations_total",
                            {
                                "operation": operation,
                                "status":"success",

                            },
                        )
                    return result

            except Exception:
                if operation is not None:
                    metrics.increment(
                            "mexe_operations_total",
                            {
                                "operation":operation,
                                "status":"error",
                            },
                        )
                    raise
            finally:

                duration_seconds = time.perf_counter() - start

                labels = {
                        "stage": stage,
                        }

                if operation is not None:
                    labels["operation"] = operation

                metrics.observe(
                    metric_name,
                    duration_seconds,
                    labels=labels,
                )

        return wrapper

    return decorator
