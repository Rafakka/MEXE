import logging

from fastapi.responses import PlainTextResponse

from app.observability.metrics import metrics
from app.observability.decorators import measure_time

from fastapi import APIRouter, File, UploadFile, Form, HTTPException, Request

from app.infra.validators.input_validator import InputValidator
from app.infra.image_decoder import ImageDecoder
from app.domain.processors.normalize_processor import NormalizeProcessor
from app.domain.processors.blend_processor import BlendProcessor
from app.infra.image_encoder import ImageEncoder

from app.api.contracts.responses import BLEND_RESPONSES, HEALTH_RESPONSES
from app.api.contracts.health_response import HealthResponse
from app.domain.health_checker import HealthChecker
from app.domain.health_status import HealthStatus

logger = logging.getLogger("mexe")

router = APIRouter()

input_validator = InputValidator()
image_decoder = ImageDecoder()
normalize_processor = NormalizeProcessor()
blend_processor = BlendProcessor()
image_encoder = ImageEncoder()

health_checker = HealthChecker()

@router.post("/blend",
             tags=["Image Processing"],
             summary="Blend Two Images",
             description="Receives two uploaded images, normalizes them to a target size, blends them in memory and returns the generated image.",
             response_description="Blended image in the chosen format",
             responses=BLEND_RESPONSES
             )

@measure_time("blend_processing_duration_seconds")
async def blend(request:Request,
        implicit_image_a: UploadFile = File(..., description="First image to blend"),
        implicit_image_b: UploadFile = File(..., description="Second image to blend"),
        width: int = Form(...,title="Outuput width",description="Target width in pixels", examples=[1024]),
        height: int = Form(...,title="Outuput height",description="Target height in pixels", examples=[1024])
        ):

    request_id = request.state.request_id

    logger.info(
            "image_processing_started",
            extra={
                "request_id": request_id,
                }
            )


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
            image2,
            request_id
            )

    logger.info(
    "image_processing_completed",
    extra={
        "request_id": request_id,
        },
    )

    return await image_encoder.encode(
            blended
            )

@router.get("/health",
                tags=["Health"],
                summary="Check service health",
                description="Return the current operational status of the service",
            response_model=HealthResponse,
            responses=HEALTH_RESPONSES
            )
def health() -> HealthResponse:

    status = health_checker.check()

    if status == HealthStatus.DOWN:
        raise HTTPException(
                status_code=503,
                detail="Service unavailable"
                )

    return HealthResponse (
            status=status
            )

@router.get(
    "/ready",
    response_model=HealthResponse,
    responses=HEALTH_RESPONSES,
)
def ready() -> HealthResponse:

    status = health_checker.check()

    if status == HealthStatus.DOWN:
        raise HTTPException(
            status_code=503,
            detail="Service not ready",
        )

    return HealthResponse(
        status=status
    )

@router.get("/metrics", response_class=PlainTextResponse)

def metrics_endpoints():
    return metrics.prometheus_snapshot()
