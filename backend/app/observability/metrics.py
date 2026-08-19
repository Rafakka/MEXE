from dataclasses import dataclass
from threading import Lock


@dataclass
class Metric:
    name: str
    count: int = 0
    total: float = 0.0
    minimum: float | None = None
    maximum: float | None = None


class MetricsCollector:

    def __init__(self) -> None:
        self._metrics: dict[str, Metric] = {}
        self._lock = Lock()

    def observe(self, name: str, value: float) -> None:
        with self._lock:
            metric = self._metrics.setdefault(
                name,
                Metric(name=name),
            )

            metric.count += 1
            metric.total += value

            if metric.minimum is None or value < metric.minimum:
                metric.minimum = value

            if metric.maximum is None or value > metric.maximum:
                metric.maximum = value

    def snapshot(self) -> dict[str, dict]:
        with self._lock:
            return {
                name: {
                    "count": metric.count,
                    "total": metric.total,
                    "minimum": metric.minimum,
                    "maximum": metric.maximum,
                }
                for name, metric in self._metrics.items()
            }

    def prometheus_snapshot(self) -> str:
        lines = []

        with self._lock:
         for metric in self._metrics.values():
            lines.append(
                f"# TYPE {metric.name} summary"
            )

            lines.append(
                f'{metric.name}_count {metric.count}'
            )

            lines.append(
                f'{metric.name}_sum {metric.total}'
            )

            if metric.minimum is not None:
                lines.append(
                    f'{metric.name}_minimum {metric.minimum}'
                )

            if metric.maximum is not None:
                lines.append(
                    f'{metric.name}_maximum {metric.maximum}'
                )

        return "\n".join(lines) + "\n"

metrics = MetricsCollector()
