
from PIL import Image

from app.settings import DEFAULT_BLEND_ALPHA

from app.observability.decorators import measure_time

import logging

logger = logging.getLogger("mexe")


class BlendProcessor:

    @measure_time("mexe_blend_duration_seconds")
    def blend(
            self,
            image1: Image.Image,
            image2: Image.Image,
            request_id:str
            ) -> Image.Image:

        logger.info("blend_started",
                extra={
                "request_id": request_id,
                "width":image1.width,
                "height":image1.height,
                "alpha":DEFAULT_BLEND_ALPHA,
                    },
                )

        blended = Image.blend(image1, image2, alpha=DEFAULT_BLEND_ALPHA)

        logger.info(
                "blend_completed",
                extra={
                    "request_id":request_id,
                    "width":blended.width,
                    "height":blended.height,
                    },
                )

        return blended
