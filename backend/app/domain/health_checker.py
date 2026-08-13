
from PIL import Image

from app.domain.health_status import HealthStatus

class HealthChecker:

    def check(self) -> HealthStatus:

        try:
            self._check_image_processing()

            return HealthStatus.UP

        except Exception:

            return HealthStatus.DOWN

    def _check_image_processing(self) -> None:

        Image.new("RGBA",(1,1))
