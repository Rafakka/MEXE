
from PIL import Image
from io import BytesIO
from fastapi.responses import StreamingResponse
from app.core.settings import MEDIA_TYPES

class ImageEncoder:

    async def encode(
            
            self,
            image:Image.Image,
            image_format: str

            ) -> StreamingResponse :

        output = BytesIO()

        image.save(
                output, 
                format=image_format
                )

        output.seek(0)

        return StreamingResponse (
                output,
                media_type=MEDIA_TYPES[image_format]
                )
