
from fastapi import APIRouter, File, UploadFile, Form
from fastapi.responses import StreamingResponse
from io import BytesIO
from PIL import Image

from app.validators.input_validator import InputValidator
from app.decoder.image_decoder import ImageDecoder
from app.processors.normalize_processor import NormalizeProcessor
from app.processors.blend_processor import BlendProcessor

router = APIRouter()

input_validator = InputValidator()
image_decoder = ImageDecoder()
normalize_processor = NormalizeProcessor()
blend_processor = BlendProcessor()

@router.post("/blend")
async def blend(
        implicit_image_a: UploadFile = File(...),
        implicit_image_b: UploadFile = File(...),
        width: int = Form(...),
        height: int = Form(...)
        ):

    await input_validator.validate(implicit_image_a)
    await input_validator.validate(implicit_image_b)

    image1 = await image_decoder.decode(implicit_image_a)
    image2 = await image_decoder.decode(implicit_image_b)
    
    target_size = (width, height)

    image1 = normalize_processor.normalize(
            image1,
            target_size
            )
    image2 = normalize_processor.normalize (
            image2,
            target_size
            )

    blended = blend_processor.blend(
            image1,
            image2
            )

    output = BytesIO()

    blended.save(output, format="PNG")

    output.seek(0)

    return StreamingResponse (
            output, 
            media_type="image/png"
            )
