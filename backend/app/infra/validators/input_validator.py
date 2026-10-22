
from PIL import Image

from fastapi import HTTPException, UploadFile

from app.core.settings import (
    SUPPORTED_IMAGE_TYPES,
    MAX_UPLOAD_SIZE_BYTES,
    MAX_IMAGE_PIXELS,
    MAX_IMAGE_WIDTH,
    MAX_IMAGE_HEIGHT,
)

import logging

logger = logging.getLogger("mexe")

from app.observability.decorators import measure_time

class InputValidator:

    @measure_time("mexe_processing_duration_seconds",stage="validate")
    async def validate(
        self,
        image: UploadFile
    ) -> None:

        logger.info(
                "Validating uploaded file '%s'",
                image.filename
                )

        await self.check_upload(image)

        if image.content_type not in SUPPORTED_IMAGE_TYPES:
            logger.warning(
                    "Rejected upload '%s'(%s)",
                    image.filename,
                    image.content_type
                    )
            raise HTTPException(
                status_code=415,
                detail=f"Unsupported image format:{image.content_type}")

        logger.info(
                "Validation successful (%s)",
                image.content_type
                )

    @measure_time("mexe_processing_duration_seconds", stage="check_upload")
    async def check_upload(
        self,
        image: UploadFile
    ) -> None:

        if image.size is None:
            raise HTTPException(
                status_code=400,
                detail="Unable to determine uploaded file size"
            )

        if image.size > MAX_UPLOAD_SIZE_BYTES:
            logger.warning(
                "Rejected upload '%s' (%d bytes > %d bytes)",
                image.filename,
                image.size,
                MAX_UPLOAD_SIZE_BYTES
            )
            raise HTTPException(
                status_code=413,
                detail="Uploaded file is too large"
            )

    @measure_time("mexe_processing_duration_seconds", stage="check_pixels")
    def check_pixels(
             self,
             image: Image.Image
             ) -> None:

        pixels = image.width * image.height

        if pixels > MAX_IMAGE_PIXELS:
            logger.warning(
                "Rejected image (%d pixels > %d pixels)",
                pixels,
                MAX_IMAGE_PIXELS
            )
            raise HTTPException(
                status_code=413,
                detail="Image contains too many pixels"
            )

    @measure_time("mexe_processing_duration_seconds", stage="check_width")
    def check_width(
        self,
        image: Image.Image
    ) -> None:

        if image.width > MAX_IMAGE_WIDTH:
            logger.warning(
                "Rejected image (%dpx width > %dpx)",
                image.width,
                MAX_IMAGE_WIDTH
            )
            raise HTTPException(
                status_code=413,
                detail="Image width exceeds the maximum allowed"
            )

    @measure_time("mexe_processing_duration_seconds", stage="check_height")
    def check_height(
        self,
        image: Image.Image
    ) -> None:

        if image.height > MAX_IMAGE_HEIGHT:
            logger.warning(
                "Rejected image (%dpx height > %dpx)",
                image.height,
                MAX_IMAGE_HEIGHT
            )
            raise HTTPException(
                status_code=413,
                detail="Image height exceeds the maximum allowed"
            )

    @measure_time("mexe_processing_duration_seconds", stage="check_out_pixels")
    def check_out_pixels(
        self,
        width: int,
        height: int
    ) -> None:

        pixels = width * height

        if width <= 0 or height <= 0:
            logger.warning(
                "Rejected output dimensions (%dx%d)",
                width,
                height,
            )
            raise HTTPException(
                status_code=422,
                detail="Output dimensions must be positive",
            )

        if pixels > MAX_IMAGE_PIXELS:
            logger.warning(
                "Rejected output size (%d pixels > %d pixels)",
                pixels,
                MAX_IMAGE_PIXELS
            )
            raise HTTPException(
                status_code=413,
                detail="Output image contains too many pixels"
            )
