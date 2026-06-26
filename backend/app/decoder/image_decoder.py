

from fastapi import UploadFile

from PIL import Image

from io import BytesIO

class ImageDecoder:

    async def decode(
            self,
            image: UploadFile
            ) -> Image.Image:

        return Image.open(
                BytesIO(await image.read())

            )
