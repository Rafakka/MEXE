
from fastapi import APIRouter, File, UploadFile, 

from app.infra.validators.input_validator import InputValidator
from app.infra.image_decoder import ImageDecoder
from app.domain.processors.normalize_processor import NormalizeProcessor
from app.domain.processors.blend_processor import BlendProcessor
from app.infra.image_encoder import ImageEncoder

router = APIRouter()

input_validator = InputValidator()
image_decoder = ImageDecoder()
normalize_processor = NormalizeProcessor()
blend_processor = BlendProcessor()
image_encoder = ImageEncoder()

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

    return await image_encoder.encode(
            blended,
            "PNG"
            )
