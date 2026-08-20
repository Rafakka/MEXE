import logging

from app.observability.decorators import measure_time

from fastapi import UploadFile

from PIL import Image

from io import BytesIO

logger = logging.getLogger("mexe")

class ImageDecoder:

    @measure_time("mexe_processing_duration_seconds", stage="decode")
    async def decode(
            self,
            image: UploadFile
            ) -> Image.Image:

        logger.info(f"Decoding image '%s' (%s)",
                    image.filename,
                    image.content_type
                    )

        decoded = Image.open(
                BytesIO(await image.read())
                )

        logger.info(
                "Image decoded succesfully (%dx%d)",
                decoded.width,
                decoded.height,
                )

        return decoded
