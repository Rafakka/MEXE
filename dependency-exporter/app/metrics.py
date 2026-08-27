

from prometheus_client import Counter, Gauge, Histogram


renovate_open_mrs = Gauge(
    "mexe_renovate_open_mrs",
    "Number of open Renovate merge requests",
)


renovate_major_updates = Gauge(
    "mexe_renovate_major_updates",
    "Number of open Renovate merge requests containing major updates",
)


renovate_security_updates = Gauge(
    "mexe_renovate_security_updates",
    "Number of open Renovate merge requests related to security updates",
)

gitlab_api_success = Gauge(
    "mexe_gitlab_api_success",
    "Whether the last GitLab API request succeeded",
)

gitlab_api_errors = Counter(
    "mexe_gitlab_api_errors_total",
    "Total number of Gitlab API errors",
)

gitlab_api_duration = Histogram(
    "mexe_gitlab_api_duration_seconds",
    "Duration of GitLab API requests in seconds",
)


