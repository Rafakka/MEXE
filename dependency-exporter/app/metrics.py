

from prometheus_client import Counter, Gauge, Histogram


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

renovate_open_mrs = Gauge(
    "mexe_renovate_open_mrs",
    "Number of open Renovate merge requests",
)

renovate_updates = Gauge(
    "mexe_renovate_updates",
    "Number of open Renovate updates by update type",
    ["update_type"],
)

renovate_conflicts = Gauge(
    "mexe_renovate_conflicts",
    "Number of open Renovate merge requests with conflicts",
)

renovate_oldest_mr_age_seconds = Gauge(
    "mexe_renovate_oldest_mr_age_seconds",
    "Age in seconds of the oldest open Renovate merge request",
)
