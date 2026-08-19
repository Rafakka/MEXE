
from dataclasses import dataclass, field
from threading import Lock


@dataclass
class Metric:
    name: str
    labels: dict[str,str] = field(default_factory=dict)
    count: int = 0
    total: float = 0.0
    minimum: float | None = None
    maximum: float | None = None
    buckets: dict[float, int] = field(default_factory=dict)


class MetricsCollector:

    DEFAULT_BUCKETS = (
        0.005,
        0.01,
        0.025,
        0.05,
        0.1,
        0.25,
        0.5,
        1.0,
        2.5,
        5.0,
            )

    def __init__(self) -> None:
        self._metrics: dict[tuple[str, tuple[tuple[str, str], ...]], Metric] = {}
        self._lock = Lock()

    def observe(self, name: str, value: float, labels: dict[str,str] | None = None, ) -> None:
        with self._lock:

            labels = labels or {}

            metric_key = (
                name,
                tuple(sorted(labels.items())),
            )

            metric = self._metrics.setdefault(
                metric_key,
                Metric(
                    name=name,
                    labels=labels,
                    buckets={
                        bucket: 0
                        for bucket in self.DEFAULT_BUCKETS
                        },
                    ),
            )

            metric.count += 1
            metric.total += value

            if metric.minimum is None or value < metric.minimum:
                metric.minimum = value

            if metric.maximum is None or value > metric.maximum:
                metric.maximum = value

            for bucket in self.DEFAULT_BUCKETS:
                if value <= bucket:
                    metric.buckets[bucket] += 1
    def snapshot(self) -> dict:
        with self._lock:
            return {
                str(metric_key): {
                    "name": metric.name,
                    "labels": metric.labels,
                    "count": metric.count,
                    "total": metric.total,
                    "minimum": metric.minimum,
                    "maximum": metric.maximum,
                }
                for metric_key, metric in self._metrics.items()
            }

    def prometheus_snapshot(self) -> str:
        lines = []

        with self._lock:
            for metric in self._metrics.values():

                lines.append(
                f"# HELP {metric.name} Duration of {metric.name}."
                )

                lines.append(
                f"# TYPE {metric.name} histogram"
                )

                for bucket in self.DEFAULT_BUCKETS:
                    count = metric.buckets[bucket]

                    lines.append(
                        f'{metric.name}_bucket{{le="{bucket}"}} {count}'
                    )

                lines.append(
                    f'{metric.name}_bucket{{le="+Inf"}} {metric.count}'
                )

                lines.append(
                    f"{metric.name}_sum {metric.total}"
                )

                lines.append(
                    f"{metric.name}_count {metric.count}"
                )

            return "\n".join(lines) + "\n"

metrics = MetricsCollector()
