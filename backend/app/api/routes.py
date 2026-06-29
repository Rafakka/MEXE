
from fastapi import APIRouter, File, UploadFile, Form

from app.infra.validators.input_validator import InputValidator
from app.infra.image_decoder import ImageDecoder
from app.domain.processors.normalize_processor import NormalizeProcessor
from app.domain.processors.blend_processor import BlendProcessor
from app.infra.image_encoder import ImageEncoder

from app.api.contracts.responses import BLEND_RESPONSES
from app.api.contracts.health_response import HealthResponse
from app.domain.health_status import HealthStatus

router = APIRouter()

input_validator = InputValidator()
image_decoder = ImageDecoder()
normalize_processor = NormalizeProcessor()
blend_processor = BlendProcessor()
image_encoder = ImageEncoder()

@router.post("/blend", 
             tags=["Image Processing"],
             summary="Blend Two Images",
             description="Receives two uploaded images, normalizes them to a target size, blends them in memory and returns the generated image.",
             response_description="Blended image in the chosen format",
             responses=BLEND_RESPONSES
             )
async def blend(
        implicit_image_a: UploadFile = File(..., description="First image to blend"),
        implicit_image_b: UploadFile = File(..., description="Second image to blend"),
        width: int = Form(...,title="Outuput width",description="Target width in pixels", example=1024), 
        height: int = Form(...,title="Outuput height",description="Target height in pixels", example=1024)
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

@router.get("/health",
                tags=["Health checker"],
            )
def health() -> HealthResponse:

    return HealthResponse (
            status=HealthStatus.Up
            )
