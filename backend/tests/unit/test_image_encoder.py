

import pytest

from fastapi.responses import StreamingResponse

@pytest.mark.asyncio
async def test_encode_image(
        new_image,
        image_encoder
        ):

    encoded = await image_encoder.encode(
            new_image,
            "PNG"
            )

    assert isinstance(encoded, StreamingResponse)

    assert encoded.media_type == "image/png"

@pytest.mark.asyncio
async def test_encode_image_error(
        new_image,
        image_encoder
        ):

    await image_encoder.encode(
            new_image,
            "Batata"
            )
