
from fastapi import HTTPException, UploadFile

from app.core.settings import SUPPORTED_IMAGE_TYPES

import logging

logger = logging.getLogger(__name__)

class InputValidator:

    async def validate(
        self,
        image: UploadFile
    ) -> None:

        logger.info(
                "Validanting uploaded file '%s'",
                image.filename
                )

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
