from threading import Lock

from prometheus_client import Counter, Histogram, generate_latest


class MetricsCollector:

    def __init__(self) -> None:
        self._metrics: dict[str, Histogram] = {}
        self._counters: dict[str, Counter] = {}
        self._lock = Lock()

    def _get_counter(self, name: str) -> Counter:
        counter = self._counters.get(name)

        if counter is None:
            counter = Counter(
                name,
                f"Total of {name}.",
                labelnames=["operation", "status"],
            )

            self._counters[name] = counter

        return counter

    def increment(
        self,
        name: str,
        labels: dict[str, str] | None = None,
        ) -> None:

        labels = labels or {}

        with self._lock:
            counter = self._get_counter(name)

        counter.labels(
            **labels
        ).inc()

    def _get_histogram(self, name: str) -> Histogram:

        histogram = self._metrics.get(name)

        if histogram is None:
            histogram = Histogram(
                name,
                f"Duration of {name}.",
                labelnames=["operation", "stage"],
            )

            self._metrics[name] = histogram

        return histogram

    def observe(
        self,
        name: str,
        value: float,
        labels: dict[str, str] | None = None,
    ) -> None:

        labels = labels or {}

        with self._lock:
            histogram = self._get_histogram(name)

        histogram.labels(
            **labels
        ).observe(value)

    def prometheus_snapshot(self) -> str:
        return generate_latest().decode("utf-8")

metrics = MetricsCollector()
