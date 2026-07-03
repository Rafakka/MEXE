

from fastapi import UploadFile

from PIL import Image

from io import BytesIO

import logging

logger = logging.getLogger(__name__)

class ImageDecoder:

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
