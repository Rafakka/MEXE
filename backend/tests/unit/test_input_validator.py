

import pytest

from fastapi import HTTPException


@pytest.mark.asyncio
async def test_invalid_input(
        invalid_image_upload,
        input_validator
        ):

    with pytest.raises(HTTPException) as exc:
        await input_validator.validate(invalid_image_upload)
        
    assert exc.value.status_code == 415
    assert exc.value.detail == "Unsupported image format:text/plain"

@pytest.mark.asyncio
async def test_valid_png_input(
        valid_image_upload,
        input_validator
        ):

    await input_validator.validate(valid_image_upload)

