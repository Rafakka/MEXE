
from PIL import Image

from pathlib import Path

from fastapi import UploadFile

from starlette.datastructures import Headers

from io import BytesIO

import pytest

from app.domain.processors.blend_processor import BlendProcessor

from app.infra.validators.input_validator import InputValidator

from app.infra.image_decoder import ImageDecoder

from app.infra.image_encoder import ImageEncoder

from app.domain.processors.normalize_processor import NormalizeProcessor

def pytest_addoption(parser):
    parser.addoption(
        "--capacity-images",
        action="store",
        default=None,
        metavar="DIR",
        help="Directory containing image-a.png and image-b.png "
             "for capacity characterization.",
    )

@pytest.fixture
def capacity_image_samples(pytestconfig):
    raw_directory = pytestconfig.getoption("--capacity-images")

    # Without the option, keep the existing synthetic mode.
    if not raw_directory:
        return None

    directory = Path(raw_directory).expanduser()

    if not directory.is_absolute():
        directory = Path(pytestconfig.rootpath) / directory

    paths = {
        "image_a": directory / "image-a.png",
        "image_b": directory / "image-b.png",
    }

    missing = [
        str(path)
        for path in paths.values()
        if not path.is_file()
    ]

    if missing:
        pytest.fail(
            "--capacity-images requires both image files. "
            f"Missing: {', '.join(missing)}"
        )

    return {
        name: {
            "path": str(path),
            "data": path.read_bytes(),
        }
        for name, path in paths.items()
    }

@pytest.fixture
def new_image():

    new_image = Image.new("RGBA",(250,250),(0,0,0,0))

    return new_image

@pytest.fixture
def image1():

   image1 = Image.new("RGBA", (250,250), (255,0,0,255))

   return image1

@pytest.fixture
def image2():

    image2 = Image.new("RGBA",(250,250), (255,255,0,255))

    return image2

@pytest.fixture
def blend_processor():

    blend_processor = BlendProcessor()

    return blend_processor

@pytest.fixture
def input_validator():

   input_validator = InputValidator()

   return input_validator

@pytest.fixture
def image_decoder():

    image_decoder = ImageDecoder()

    return image_decoder

@pytest.fixture
def image_encoder():

    image_encoder = ImageEncoder()

    return image_encoder

@pytest.fixture
def normalize_processor():

    normalize_processor = NormalizeProcessor()

    return normalize_processor


@pytest.fixture
def valid_image_upload():

    image = Image.new("RGBA", (250,250), (255,0,0,255))

    buffer = BytesIO()

    image.save(buffer, format="PNG")

    buffer.seek(0)

    headers = Headers(
    {
        "content-type": "image/png"
    }
        )

    return UploadFile(
        file=buffer,
        size=len(buffer.getvalue()),
        filename="image.png",
        headers=headers,
    )



@pytest.fixture
def invalid_image_upload():

    file_to_test = BytesIO(b"Hello Test")

    file_to_test.seek(0)

    headers = Headers(
    {
        "content-type": "text/plain"
    }
        )


    return UploadFile(
        file=file_to_test,
        size=len(file_to_test.getvalue()),
        filename="hellotest.txt",
        headers=headers,
    )

@pytest.fixture
def allow_capacity_candidate(monkeypatch):
    import app.infra.validators.input_validator as validator_module

    def configure(width: int, height: int) -> None:
        # This is deliberately test-only: it allows measuring candidate sizes
        # beyond current production limits without changing settings.py.
        monkeypatch.setattr(validator_module, "MAX_IMAGE_WIDTH", width)
        monkeypatch.setattr(validator_module, "MAX_IMAGE_HEIGHT", height)
        monkeypatch.setattr(
            validator_module,
            "MAX_IMAGE_PIXELS",
            width * height,
        )

    return configure
