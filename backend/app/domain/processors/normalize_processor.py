import logging

from PIL import Image

from app.observability.decorators import measure_time

logger = logging.getLogger("mexe")

class NormalizeProcessor:

    @measure_time("mexe_processing_duration_seconds", stage="normalize_convert")
    def convert(
            self,
            image: Image.Image,
            ) -> Image.Image:

        return image.convert("RGBA")

    @measure_time(
        "mexe_processing_duration_seconds",
        stage="normalize_resize",
    )
    def resize(
        self,
        image: Image.Image,
        target_size: tuple[int, int],
    ) -> Image.Image:

        return image.resize(target_size)

    @measure_time(
        "mexe_processing_duration_seconds",
        stage="normalize",
    )
    def normalize(
        self,
        image: Image.Image,
        target_size: tuple[int, int],
    ) -> Image.Image:

        logger.info(
            "Normalizing Image (%dx%d) to (%dx%d)",
            image.width,
            image.height,
            target_size[0],
            target_size[1],
        )

        image = self.convert(image)
        image = self.resize(image, target_size)

        logger.info(
            "Image normalized successfully (%dx%d)",
            image.width,
            image.height,
        )

        return image
