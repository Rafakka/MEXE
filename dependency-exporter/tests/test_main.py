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
    assert "mexe_renovate_major_updates 1.0" in body


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


