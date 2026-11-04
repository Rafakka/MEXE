import logging

from app.observability.decorators import measure_time

from fastapi import UploadFile

from PIL import Image

from io import BytesIO

logger = logging.getLogger("mexe")


class ImageDecoder:

    @measure_time(
        "mexe_processing_duration_seconds",
        stage="decode_async",
    )
    async def decode(
        self,
        image: UploadFile,
    ) -> Image.Image:

        logger.info(
            "Opening image '%s' (%s)",
            image.filename,
            image.content_type,
        )

        return self.decode_bytes(
            await image.read()
        )

    @measure_time(
        "mexe_processing_duration_seconds",
        stage="decode_open",
    )
    def decode_bytes(
        self,
        content: bytes,
    ) -> Image.Image:

        decoded = Image.open(
            BytesIO(content)
        )

        logger.info(
            "Image opened successfully (%dx%d)",
            decoded.width,
            decoded.height,
        )

        return decoded

    @measure_time(
        "mexe_processing_duration_seconds",
        stage="decode_pixels",
    )
    def load_pixels(
        self,
        image: Image.Image,
    ) -> Image.Image:

        image.load()

        logger.info(
            "Image pixels decoded successfully (%dx%d)",
            image.width,
            image.height,
        )

        return image
