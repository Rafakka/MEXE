
from app.api import routes
from app.domain.health_checker import HealthChecker
from app.domain.health_status import HealthStatus


def test_health_checker_returns_up():

    checker = HealthChecker()

    result = checker.check()

    assert result == HealthStatus.UP

def test_health_checker_returns_down(monkeypatch):

    checker = HealthChecker()

    def failing_check():
        raise RuntimeError("Image processing unavaliable")

    monkeypatch.setattr(
            checker,
            "_check_image_processing",
            failing_check
            )

    result = checker.check()

    assert result == HealthStatus.DOWN

