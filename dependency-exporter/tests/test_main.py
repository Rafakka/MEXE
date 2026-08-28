from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_health():
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


@patch(
    "app.main.fetch_open_merge_requests",
    new_callable=AsyncMock,
)
def test_metrics_with_renovate_merge_requests(mock_fetch):
    mock_fetch.return_value = [
    {
        "source_branch": "renovate/dependency-a",
        "description": """
        This MR contains the following updates:

        | Package | Update | Change |
        |---|---|---|
        | example/package-a | major | `v1.0.0` → `v2.0.0` |
        """,
        },
        {
        "source_branch": "renovate/dependency-b",
        "description": """
        This MR contains the following updates:

        | Package | Update | Change |
        |---|---|---|
        | example/package-b | patch | `v1.2.0` → `v1.2.1` |
        """,
            },
        {
            "source_branch": "feature/documentation",
            "description": "Normal merge request.",
        },
    ]

    response = client.get("/metrics")

    assert response.status_code == 200

    body = response.text

    assert "mexe_renovate_open_mrs 2.0" in body

    mock_fetch.assert_awaited_once()

@patch(
    "app.main.fetch_open_merge_requests",
    new_callable=AsyncMock,
)
def test_metrics_when_gitlab_fails(mock_fetch):
    mock_fetch.side_effect = RuntimeError("GitLab unavailable")

    response = client.get("/metrics")

    assert response.status_code == 200

    body = response.text

    assert "mexe_gitlab_api_success 0.0" in body
    assert "mexe_gitlab_api_errors_total" in body

    mock_fetch.assert_awaited_once()

@patch(
    "app.main.fetch_open_merge_requests",
    new_callable=AsyncMock,
)
def test_metrics_when_gitlab_token_is_missing(mock_fetch):
    mock_fetch.side_effect = RuntimeError(
        "GITLAB_TOKEN is not configured"
    )

    response = client.get("/metrics")

    assert response.status_code == 200

    body = response.text

    assert "mexe_gitlab_api_success 0.0" in body
    assert "mexe_gitlab_api_errors_total" in body

    mock_fetch.assert_awaited_once()

def test_metrics_records_gitlab_duration():
    with patch(
        "app.main.fetch_open_merge_requests",
        new_callable=AsyncMock,
    ) as mock_fetch:
        mock_fetch.return_value = [
           {
                "source_branch": "feature/some-change",
            }
        ]

        response = client.get("/metrics")

    assert response.status_code == 200

    body = response.text

    assert "mexe_gitlab_api_duration_seconds" in body
    assert "mexe_gitlab_api_duration_seconds_count" in body
    assert "mexe_gitlab_api_duration_seconds_sum" in body

    mock_fetch.assert_awaited_once()

def test_metrics_records_gitlab_duration_when_gitlab_fails():
    with patch(
        "app.main.fetch_open_merge_requests",
        new_callable=AsyncMock,
    ) as mock_fetch:
        mock_fetch.side_effect = RuntimeError("GitLab unavailable")

        response = client.get("/metrics")

    assert response.status_code == 200

    body = response.text

    assert "mexe_gitlab_api_duration_seconds" in body
    assert "mexe_gitlab_api_duration_seconds_count" in body
    assert "mexe_gitlab_api_success 0.0" in body
    assert "mexe_gitlab_api_errors_total" in body

    mock_fetch.assert_awaited_once()

def test_ready():
    with patch.dict(
        "os.environ",
        {
            "GITLAB_TOKEN": "test-token",
            "GITLAB_PROJECT": "test/project",
            "GITLAB_URL": "https://gitlab.com",
        },
        clear=True,
    ):
        response = client.get("/ready")

    assert response.status_code == 200
    assert response.json() == {"status": "ready"}

def test_not_ready_without_gitlab_token():
    with patch.dict(
        "os.environ",
        {
            "GITLAB_PROJECT": "test/project",
            "GITLAB_URL": "https://gitlab.com",
        },
        clear=True,
    ):
        response = client.get("/ready")

    assert response.status_code == 503
    assert response.json()["status"] == "not ready"

def test_not_ready_without_gitlab_project():
    with patch.dict(
        "os.environ",
        {
            "GITLAB_TOKEN": "test-token",
            "GITLAB_URL": "https://gitlab.com",
        },
        clear=True,
    ):
        response = client.get("/ready")

    assert response.status_code == 503

def test_not_ready_without_gitlab_url():
    with patch.dict(
        "os.environ",
        {
            "GITLAB_TOKEN": "test-token",
            "GITLAB_PROJECT": "test/project",
        },
        clear=True,
    ):
        response = client.get("/ready")

    assert response.status_code == 503

@patch(
    "app.main.fetch_open_merge_requests",
    new_callable=AsyncMock,
)
def test_metrics_uses_renovate_update_type(mock_fetch):
    mock_fetch.return_value = [
        {
            "source_branch": "renovate/dependency-a",
            "description": """
This MR contains the following updates:

| Package | Update | Change |
|---|---|---|
| example/package | major | `v1.0.0` → `v2.0.0` |
""",
        },
        {
            "source_branch": "renovate/dependency-b",
            "description": """
This MR contains the following updates:

| Package | Update | Change |
|---|---|---|
| another/package | patch | `v1.2.0` → `v1.2.1` |
""",
        },
    ]

    response = client.get("/metrics")

    assert response.status_code == 200

    body = response.text

    assert "mexe_renovate_open_mrs 2.0" in body

@patch(
    "app.main.fetch_open_merge_requests",
    new_callable=AsyncMock,
)
def test_metrics_records_renovate_updates_by_type(mock_fetch):
    mock_fetch.return_value = [
        {
            "source_branch": "renovate/dependency-a",
            "description": """
This MR contains the following updates:

| Package | Update | Change |
|---|---|---|
| example/package-a | major | `v1.0.0` → `v2.0.0` |
""",
        },
        {
            "source_branch": "renovate/dependency-b",
            "description": """
This MR contains the following updates:

| Package | Update | Change |
|---|---|---|
| example/package-b | patch | `v1.2.0` → `v1.2.1` |
""",
        },
        {
            "source_branch": "renovate/dependency-c",
            "description": """
This MR contains the following updates:

| Package | Change | Age | Confidence |
|---|---|---|---|
| example/package-c | `1.0.0` → `1.0.1` | age | confidence |
""",
        },
    ]

    response = client.get("/metrics")

    assert response.status_code == 200

    body = response.text

    assert 'mexe_renovate_updates{update_type="major"} 1.0' in body
    assert 'mexe_renovate_updates{update_type="patch"} 1.0' in body
    assert 'mexe_renovate_updates{update_type="unknown"} 1.0' in body

@patch(
    "app.main.fetch_open_merge_requests",
    new_callable=AsyncMock,
)
def test_metrics_records_renovate_conflicts(mock_fetch):
    mock_fetch.return_value = [
        {
            "source_branch": "renovate/dependency-a",
            "has_conflicts": True,
            "description": """
This MR contains the following updates:

| Package | Update | Change |
|---|---|---|
| example/package-a | patch | `v1.0.0` → `v1.0.1` |
""",
        },
        {
            "source_branch": "renovate/dependency-b",
            "has_conflicts": False,
            "description": """
This MR contains the following updates:

| Package | Update | Change |
|---|---|---|
| example/package-b | minor | `v1.0.0` → `v1.1.0` |
""",
        },
        {
            "source_branch": "renovate/dependency-c",
            "has_conflicts": True,
            "description": """
This MR contains the following updates:

| Package | Update | Change |
|---|---|---|
| example/package-c | major | `v1.0.0` → `v2.0.0` |
""",
        },
    ]

    response = client.get("/metrics")

    assert response.status_code == 200

    body = response.text

    assert "mexe_renovate_conflicts 2.0" in body


@patch(
    "app.main.fetch_open_merge_requests",
    new_callable=AsyncMock,
)
def test_metrics_records_oldest_renovate_mr_age(mock_fetch):
    mock_fetch.return_value = [
        {
            "source_branch": "renovate/dependency-a",
            "created_at": "2026-08-28T04:00:00Z",
            "description": """
| Package | Update | Change |
|---|---|---|
| example/package-a | patch | `v1.0.0` → `v1.0.1` |
""",
        },
        {
            "source_branch": "renovate/dependency-b",
            "created_at": "2026-08-28T05:00:00Z",
            "description": """
| Package | Update | Change |
|---|---|---|
| example/package-b | minor | `v1.0.0` → `v1.1.0` |
""",
        },
    ]

    response = client.get("/metrics")

    assert response.status_code == 200

    body = response.text

    assert "mexe_renovate_oldest_mr_age_seconds" in body


