from app.services.image_preparation_service import ImagePreparationService
from app.domain.processors.blend_processor import BlendProcessor
from app.infra.image_encoder import ImageEncoder
from PIL import Image
from time import perf_counter
import logging

logger = logging.getLogger(__name__)

def log_capacity_stage(
    request_id: str,
    stage: str,
    started_at: float,
) -> None:
    elapsed_ms = (perf_counter() - started_at) * 1000

    logger.info(
        "capacity_stage request_id=%s stage=%s elapsed_ms=%.2f",
        request_id,
        stage,
        elapsed_ms,
    )

class ImageProcessingService:

    def __init__(self):

        self.image_preparation_service = ImagePreparationService()
        self.blend_processor = BlendProcessor()
        self.image_encoder = ImageEncoder()

    async def process(
        self,
        operation,
        request_id,
    ):

        stage_start = perf_counter()

        image1, image2 = (
            self.image_preparation_service.prepare(
                operation
            )
        )

        log_capacity_stage(
            request_id,
            "prepare",
            stage_start,
        )

        # 2. Blend images.
        stage_start = perf_counter()

        blended = self.blend_processor.blend(
            image1,
            image2,
            request_id,
        )

        log_capacity_stage(
            request_id,
            "blend",
            stage_start,
        )

        stage_start = perf_counter()

        response = await self.image_encoder.encode(
            blended
        )

        log_capacity_stage(
            request_id,
            "encode",
            stage_start,
            )

        return response

    async def process_uploads(
        self,
        image_a,
        image_b,
        width,
        height,
        request_id,
    ):

        stage_start = perf_counter()

        operation = await self.image_preparation_service.prepare_uploads(
            image_a,
            image_b,
            width,
            height,
        )

        log_capacity_stage(
                request_id,
                "prepare_uploads",
                stage_start,
                )

        return await self.process(
            operation,
            request_id,
        )

    def check_blend(self, image: Image.Image, request_id: str) -> None:
        self.blend_processor.blend(
        image,
        image,
        request_id
    )
