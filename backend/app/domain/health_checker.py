from PIL import Image

from app.domain.health_status import HealthStatus
from app.services.image_processing_service import ImageProcessingService


class HealthChecker:

    def __init__(self, image_processing_service: ImageProcessingService):
        self.image_processing_service = image_processing_service

    def check(self) -> HealthStatus:
        return HealthStatus.UP

    def ready(self) -> HealthStatus:
        try:
            image = self._create_test_image()

            self.image_processing_service.check_blend(
                image,
                "readiness-check"
            )

            return HealthStatus.UP

        except Exception:
            return HealthStatus.DOWN

    def _create_test_image(self) -> Image.Image:
        return Image.new("RGBA", (1, 1))
