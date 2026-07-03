

from PIL import Image

def test_return_image_normalized(
        new_image,
        normalize_processor
        ):

    target_size = (500,300)

    normalized = normalize_processor.normalize(new_image, target_size)

    assert isinstance(normalized, Image.Image)
    assert normalized.size == target_size
    assert normalized.mode == "RGBA"
