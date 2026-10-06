from app.domain.health_checker import HealthChecker
from app.domain.health_status import HealthStatus
from app.services.image_processing_service import ImageProcessingService


def test_health_checker_returns_up():

    service = ImageProcessingService()
    checker = HealthChecker(service)

    result = checker.check()

    assert result == HealthStatus.UP


def test_health_checker_returns_down(monkeypatch):

    service = ImageProcessingService()
    checker = HealthChecker(service)

    def failing_check_blend(*args, **kwargs):
        raise RuntimeError("Image processing unavailable")

    monkeypatch.setattr(
        service,
        "check_blend",
        failing_check_blend
    )

    result = checker.ready()

    assert result == HealthStatus.DOWN
