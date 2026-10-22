from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.core.settings import (
    MAX_IMAGE_HEIGHT,
    MAX_IMAGE_PIXELS,
    MAX_IMAGE_WIDTH,
    MAX_UPLOAD_SIZE_BYTES,
)
from app.infra.validators.input_validator import InputValidator


def image_dimensions(width: int, height: int) -> SimpleNamespace:
    """Provide Pillow-like dimensions without allocating large pixel buffers."""
    return SimpleNamespace(width=width, height=height)


@pytest.mark.asyncio
async def test_invalid_input(
    invalid_image_upload,
    input_validator,
):
    with pytest.raises(HTTPException) as exc:
        await input_validator.validate(invalid_image_upload)

    assert exc.value.status_code == 415
    assert exc.value.detail == "Unsupported image format:text/plain"


@pytest.mark.asyncio
async def test_valid_png_input(
    valid_image_upload,
    input_validator,
):
    await input_validator.validate(valid_image_upload)
    assert valid_image_upload.file.tell() == 0


@pytest.mark.asyncio
async def test_validate_rejects_upload_over_limit(
    valid_image_upload,
    input_validator,
):
    valid_image_upload.size = MAX_UPLOAD_SIZE_BYTES + 1

    with pytest.raises(HTTPException) as exc:
        await input_validator.validate(valid_image_upload)

    assert exc.value.status_code == 413
    assert exc.value.detail == "Uploaded file is too large"


@pytest.mark.asyncio
async def test_check_upload_accepts_exact_limit_without_reading(
    valid_image_upload,
    input_validator,
):
    valid_image_upload.size = MAX_UPLOAD_SIZE_BYTES

    await input_validator.check_upload(valid_image_upload)

    # The later ImagePreparationService still needs to read the full upload.
    assert valid_image_upload.file.tell() == 0


@pytest.mark.asyncio
async def test_check_upload_rejects_one_byte_over_limit(
    valid_image_upload,
    input_validator,
):
    valid_image_upload.size = MAX_UPLOAD_SIZE_BYTES + 1

    with pytest.raises(HTTPException) as exc:
        await input_validator.check_upload(valid_image_upload)

    assert exc.value.status_code == 413
    assert exc.value.detail == "Uploaded file is too large"


@pytest.mark.asyncio
async def test_check_upload_rejects_unknown_size(
    valid_image_upload,
    input_validator,
):
    valid_image_upload.size = None

    with pytest.raises(HTTPException) as exc:
        await input_validator.check_upload(valid_image_upload)

    assert exc.value.status_code == 400
    assert exc.value.detail == "Unable to determine uploaded file size"


@pytest.mark.parametrize(
    "pixels",
    [MAX_IMAGE_PIXELS - 1, MAX_IMAGE_PIXELS],
)
def test_check_pixels_accepts_below_and_at_limit(
    pixels,
    input_validator,
):
    input_validator.check_pixels(image_dimensions(pixels, 1))


def test_check_pixels_rejects_one_pixel_over_limit(input_validator):
    image = image_dimensions(MAX_IMAGE_PIXELS + 1, 1)

    with pytest.raises(HTTPException) as exc:
        input_validator.check_pixels(image)

    assert exc.value.status_code == 413
    assert exc.value.detail == "Image contains too many pixels"


@pytest.mark.parametrize(
    "width",
    [MAX_IMAGE_WIDTH - 1, MAX_IMAGE_WIDTH],
)
def test_check_width_accepts_below_and_at_limit(
    width,
    input_validator,
):
    input_validator.check_width(image_dimensions(width, 1))


def test_check_width_rejects_one_pixel_over_limit(input_validator):
    image = image_dimensions(MAX_IMAGE_WIDTH + 1, 1)

    with pytest.raises(HTTPException) as exc:
        input_validator.check_width(image)

    assert exc.value.status_code == 413
    assert exc.value.detail == "Image width exceeds the maximum allowed"


@pytest.mark.parametrize(
    "height",
    [MAX_IMAGE_HEIGHT - 1, MAX_IMAGE_HEIGHT],
)
def test_check_height_accepts_below_and_at_limit(
    height,
    input_validator,
):
    input_validator.check_height(image_dimensions(1, height))


def test_check_height_rejects_one_pixel_over_limit(input_validator):
    image = image_dimensions(1, MAX_IMAGE_HEIGHT + 1)

    with pytest.raises(HTTPException) as exc:
        input_validator.check_height(image)

    assert exc.value.status_code == 413
    assert exc.value.detail == "Image height exceeds the maximum allowed"


@pytest.mark.parametrize(
    ("width", "height"),
    [
        (1, 1),
        (MAX_IMAGE_PIXELS, 1),
        (1, MAX_IMAGE_PIXELS),
    ],
)
def test_check_out_pixels_accepts_below_and_at_limit(
    width,
    height,
    input_validator,
):
    assert width * height <= MAX_IMAGE_PIXELS
    input_validator.check_out_pixels(width, height)


def test_check_out_pixels_rejects_one_pixel_over_limit(input_validator):
    with pytest.raises(HTTPException) as exc:
        input_validator.check_out_pixels(MAX_IMAGE_PIXELS + 1, 1)

    assert exc.value.status_code == 413
    assert exc.value.detail == "Output image contains too many pixels"


@pytest.mark.parametrize(
    ("width", "height"),
    [
        (0, 1),
        (1, 0),
        (-1, 1),
        (1, -1),
    ],
)
def test_check_out_pixels_rejects_non_positive_dimensions(
    width,
    height,
    input_validator,
):
    """Regression guard: invalid dimensions should fail before Pillow resize."""
    with pytest.raises(HTTPException) as exc:
        input_validator.check_out_pixels(width, height)

    assert exc.value.status_code == 422
    assert exc.value.detail == "Output dimensions must be positive"
