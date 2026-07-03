
from PIL import Image

from fastapi import UploadFile

from starlette.datastructures import Headers

from io import BytesIO

import pytest

from app.domain.processors.blend_processor import BlendProcessor

from app.infra.validators.input_validator import InputValidator

from app.infra.image_decoder import ImageDecoder

from app.infra.image_encoder import ImageEncoder

from app.domain.processors.normalize_processor import NormalizeProcessor


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
            filename="image.png",
            headers=headers
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
            file = file_to_test,
            filename="hellotest.txt",
            headers=headers
            )
