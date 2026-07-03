

import pytest

from PIL import Image, UnidentifiedImageError

@pytest.mark.asyncio
async def test_decode_image(
        valid_image_upload,
        image_decoder
        ):

    decoded = await image_decoder.decode(valid_image_upload)

    assert isinstance(decoded, Image.Image)

@pytest.mark.asyncio
async def test_decode_image_error(
        invalid_image_upload,
        image_decoder
        ):

    with pytest.raises(UnidentifiedImageError):
        await image_decoder.decode(invalid_image_upload)


