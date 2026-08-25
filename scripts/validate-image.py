
from PIL import Image
import sys

image_path = sys.argv[1]

with Image.open(image_path) as image:
    image.verify()

with Image.open(image_path) as image:
    print(
        f"VALID IMAGE: {image.format} "
        f"{image.width}x{image.height}"
    )
