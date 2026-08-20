
import logging

from app.observability.decorators import measure_time

from PIL import Image
from io import BytesIO
from fastapi.responses import StreamingResponse
from app.core.settings import MEDIA_TYPES

logger = logging.getLogger("mexe")


class ImageEncoder:

    @measure_time("mexe_encoder_duration_seconds", stage="encode")
    async def encode(
            self,
            image:Image.Image,
            ) -> StreamingResponse :

        logger.info(
                "Enconding image (%dx%d)",
                image.width,
                image.height,
                )

        output = BytesIO()

        image.save(
                output,
                format="PNG"
                )

        output.seek(0)

        logger.info(
                "Imaged Encoded succefully(%dx%d)",
                image.width,
                image.height
                )


        response = StreamingResponse (
                output,
                media_type=MEDIA_TYPES["PNG"]
                )

        return response
