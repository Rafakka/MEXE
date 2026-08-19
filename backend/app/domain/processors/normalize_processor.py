import logging

from PIL import Image

from app.observability.decorators import measure_time

logger = logging.getLogger("mexe")

class NormalizeProcessor:

    @measure_time("mexe_normalize_duration_seconds")
    def normalize(
            self,
            image: Image.Image,
            target_size: tuple[int,int]
            ) -> Image.Image:

        logger.info(
                "Normalizing Image (%dx%d) to (%dx%d)",
                image.width,
                image.height,
                target_size[0],
                target_size[1],
                )

        image = image.convert("RGBA")
        image = image.resize(target_size)

        logger.info(
                "Image normalized successfully (%dx%d)",
                image.width,
                image.height
                )

        return image
