from app.services.image_preparation_service import ImagePreparationService
from app.domain.processors.blend_processor import BlendProcessor
from app.infra.image_encoder import ImageEncoder


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

        image1, image2 = (
            self.image_preparation_service.prepare(
                operation
            )
        )

        blended = self.blend_processor.blend(
            image1,
            image2,
            request_id,
        )

        return await self.image_encoder.encode(
            blended
        )

    async def process_uploads(
        self,
        image_a,
        image_b,
        width,
        height,
        request_id,
    ):

        operation = await self.image_preparation_service.prepare_uploads(
            image_a,
            image_b,
            width,
            height,
        )

        return await self.process(
            operation,
            request_id,
        )
