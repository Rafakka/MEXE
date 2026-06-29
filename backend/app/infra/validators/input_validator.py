
from fastapi import HTTPException, UploadFile

from app.core.settings import SUPPORTED_IMAGE_TYPES

class InputValidator:

    async def validate(
        self,
        image: UploadFile
    ) -> None:

        if image.content_type not in SUPPORTED_IMAGE_TYPES:
            raise HTTPException(
                status_code=415,
                detail="Unsupported image format.")
