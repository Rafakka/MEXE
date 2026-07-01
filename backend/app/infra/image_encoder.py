
from PIL import Image
from io import BytesIO
from fastapi.responses import StreamingResponse
from app.core.settings import MEDIA_TYPES

import logging

logger = logging.getLogger(__name__)


class ImageEncoder:

    async def encode(
            
            self,
            image:Image.Image,
            image_format: str

            ) -> StreamingResponse :

        logger.info(
                "Enconding image '%s'(%s)",
                image.width,
                image.height,
                image_format
                )

        output = BytesIO()

        image.save(
                output, 
                format=image_format
                )

        output.seek(0)
        
        logger.info(
                "Imaged Encoded succefully(%dx%d)",
                image_format,
                image.width,
                image.height

                )


        response = StreamingResponse (
                output,
                media_type=MEDIA_TYPES[image_format]
                )

        return response
