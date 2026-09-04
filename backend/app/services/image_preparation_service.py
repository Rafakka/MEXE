from PIL import Image

from app.infra.validators.input_validator import InputValidator
from app.infra.image_decoder import ImageDecoder
from app.domain.processors.normalize_processor import NormalizeProcessor
from app.api.contracts.resume_model import ResumeModel


class ImagePreparationService:

    def __init__(self):

        self.input_validator = InputValidator()
        self.image_decoder = ImageDecoder()
        self.normalize_processor = NormalizeProcessor()

    async def prepare_uploads(
        self,
        image_a,
        image_b,
        width: int,
        height: int,
    ) -> ResumeModel:

        await self.input_validator.validate(image_a)
        await self.input_validator.validate(image_b)

        image_1 = await image_a.read()
        image_2 = await image_b.read()

        return ResumeModel(
            id="",
            operation="blend",
            image_1=image_1,
            image_2=image_2,
            width=width,
            height=height,
            version="1.0",
            metadata={},
        )

    def prepare(
        self,
        operation: ResumeModel,
    ) -> tuple[Image.Image, Image.Image]:

        image1 = self.image_decoder.decode_bytes(
            operation.image_1
        )

        image2 = self.image_decoder.decode_bytes(
            operation.image_2
        )

        target_size = (
            operation.width,
            operation.height,
        )

        image1 = self.normalize_processor.normalize(
            image1,
            target_size,
        )

        image2 = self.normalize_processor.normalize(
            image2,
            target_size,
        )

        return image1, image2
