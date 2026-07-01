
import pytest

from PIL import Image

def test_return_pillow_image(
        image1, 
        image2,
        blend_processor
        ):
    
    ## Act

    blended = blend_processor.blend(image1,image2)
    
    ## Assert

    assert isinstance(blended, Image.Image)
    

def test_return_mixed_image(
        image1,
        image2, 
        blend_processor
        ):
    
    ## Act

    blended = blend_processor.blend(image1,image2)
    
    pixel =  blended.getpixel((125,125))

    ## Assert

    assert pixel != image1.getpixel((125,125))

    assert pixel != image2.getpixel((125,125))

def test_keep_original_files(
        image1,
        image2,
        blend_processor
        ):
    
    original_pixel1 = image1.getpixel((125,125))

    original_pixel2 = image2.getpixel((125,125))

    blend_processor.blend(image1,image2)
    
    assert image1.getpixel((125,125)) == original_pixel1

    assert image2.getpixel((125,125)) == original_pixel2

def test_return_resolution(
        image1,
        image2,
        blend_processor
        ):

    blended = blend_processor.blend(image1,image2)
    
    assert blended.size == image1.size
    assert blended.size == image2.size

