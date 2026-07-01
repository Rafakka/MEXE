

from PIL import Image

from app.domain.processors.blend_processor import BlendProcessor

def test_return_pillow_image():

    ## Arrange

    image1 = Image.new("RGBA", (250,250), (255,0,0,255))

    image2 = Image.new("RGBA",(250,250), (255,255,0,255))

    blend_processor = BlendProcessor()
    
    ## Act

    blended = blend_processor.blend(image1,image2)
    
    ## Assert

    assert isinstance(blended, Image.Image)
    

def test_return_mixed_image():

    ## Arrange

    image1 = Image.new("RGBA", (250,250), (255,0,0,255))

    image2 = Image.new("RGBA",(250,250), (255,255,0,255))

    blend_processor = BlendProcessor()
    
    ## Act

    blended = blend_processor.blend(image1,image2)
    
    pixel =  blended.getpixel((125,125))

    ## Assert

    assert pixel != image1.getpixel((125,125))

    assert pixel != image2.getpixel((125,125))

def test_keep_original_files():
    
    image1 = Image.new("RGBA", (250,250), (255,0,0,255))

    image2 = Image.new("RGBA",(250,250), (255,255,0,255))

    blend_processor = BlendProcessor()

    original_pixel1 = image1.getpixel((125,125))

    original_pixel2 = image2.getpixel((125,125))

    blend_processor.blend(image1,image2)
    
    assert image1.getpixel((125,125)) == original_pixel1

    assert image2.getpixel((125,125)) == original_pixel2

def test_return_resolution():

    image1 = Image.new("RGBA", (250,250), (255,0,0,255))

    image2 = Image.new("RGBA",(250,250), (255,255,0,255))

    blend_processor = BlendProcessor()

    blended = blend_processor.blend(image1,image2)
    
    assert blended.size == image1.size
    assert blended.size == image2.size

