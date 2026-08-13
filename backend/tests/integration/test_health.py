
from app.api import routes
from app.domain.health_status import HealthStatus


def test_request_health_info(client):

    response = client.get("/health")

    assert response.status_code == 200


def test_request_health_when_down(client, monkeypatch):

    def failing_check():
        return HealthStatus.DOWN

    monkeypatch.setattr(
        routes.health_checker,
        "check",
        failing_check
    )

    response = client.get("/health")

    assert response.status_code == 503
