
from PIL import Image

import pytest

from app.domain.processors.blend_processor import BlendProcessor

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
