import logging

from app.observability.metrics import metrics
from app.observability.decorators import measure_time

from fastapi import APIRouter, File, UploadFile, Form, HTTPException, Request, Response

from app.api.contracts.responses import BLEND_RESPONSES, HEALTH_RESPONSES, REENTRY_RESPONSES
from app.api.contracts.health_response import HealthResponse
from app.domain.reentry_file_checker import ReentryFile
from app.domain.file_status import ReentryState
from app.domain.health_checker import HealthChecker
from app.domain.health_status import HealthStatus

from app.services.request_id_service import RequestIdService
from app.services.image_processing_service import ImageProcessingService

logger = logging.getLogger("mexe")

router = APIRouter()

image_processor_sv = ImageProcessingService()
health_checker = HealthChecker()
request_id_service = RequestIdService()

@router.post("/blend",
             tags=["Image Processing"],
             summary="Blend Two Images",
             description="Receives two uploaded images, normalizes them to a target size, blends them in memory and returns the generated image.",
             response_description="Blended image in the chosen format",
             responses=BLEND_RESPONSES
             )

@measure_time("mexe_processing_duration_seconds", stage="final")

async def blend(request:Request,
        implicit_image_a: UploadFile = File(..., description="First image to blend"),
        implicit_image_b: UploadFile = File(..., description="Second image to blend"),
        width: int = Form(...,title="Outuput width",description="Target width in pixels", examples=[1024]),
        height: int = Form(...,title="Outuput height",description="Target height in pixels", examples=[1024])
        ):

    request_id = request_id_service.get(request)

    status = health_checker.check()

    if status == HealthStatus.DOWN:
        raise HTTPException(
        status_code=503,
        detail="Service not ready",
    )

    logger.info(
            "image_processing_started",
            extra={
                "request_id": request_id,
                }
            )

    return await image_processor_sv.process_uploads(
        implicit_image_a,
        implicit_image_b,
        width,
        height,
        request_id,
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

@router.get("/metrics")
def metrics_endpoint():
    return Response(
        content=metrics.prometheus_snapshot(),
        media_type="text/plain",
    )

@router.post(
    "/reentry",
    responses=REENTRY_RESPONSES,
)
async def reentry_endpoint(
    request: Request,
    file: UploadFile = File(...),
):

    request_id = request_id_service.get(request)

    reentry_file = ReentryFile()

    status = reentry_file.check(file.file)

    if status == ReentryState.INVALID:
        raise HTTPException(
            status_code=422,
            detail="Reentry File Invalid",
        )

    file.file.seek(0)

    operation = reentry_file.prepare(file.file)

    return await image_processor_sv.process(
        operation,
        request_id,
    )
