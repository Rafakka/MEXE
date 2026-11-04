import asyncio

from PIL import Image

from starlette.concurrency import run_in_threadpool

from app.infra.validators.input_validator import InputValidator
from app.infra.image_decoder import ImageDecoder
from app.domain.processors.normalize_processor import NormalizeProcessor
from app.api.contracts.resume_model import ResumeModel


class ImagePreparationService:

    def __init__(self):

        self.input_validator = InputValidator()
        self.image_decoder = ImageDecoder()
        self.normalize_processor = NormalizeProcessor()

    def _open_and_validate_image(
        self,
        content: bytes,
        ) -> Image.Image:

        image = self.image_decoder.decode_bytes(content)

        self.input_validator.check_pixels(image)
        self.input_validator.check_width(image)
        self.input_validator.check_height(image)

        return image

    def _load_and_normalize_image(
        self,
        image: Image.Image,
        target_size: tuple[int, int],
        ) -> Image.Image:

        image = self.image_decoder.load_pixels(image)

        return self.normalize_processor.normalize(
            image,
            target_size,
        )

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

    async def prepare(
        self,
        operation: ResumeModel,
    ) -> tuple[Image.Image, Image.Image]:

        # 1. Open and validate both images.
        # We preserve the validation order.

        image1 = await run_in_threadpool(
            self._open_and_validate_image,
            operation.image_1,
        )

        image2 = await run_in_threadpool(
            self._open_and_validate_image,
            operation.image_2,
        )

        # 2. Validate output dimensions.

        target_size = (
            operation.width,
            operation.height,
        )

        self.input_validator.check_out_pixels(
            operation.width,
            operation.height,
        )

        # 3. Decode pixels and normalize both images concurrently.

        image1, image2 = await asyncio.gather(

            run_in_threadpool(
                self._load_and_normalize_image,
                image1,
                target_size,
            ),

            run_in_threadpool(
                self._load_and_normalize_image,
                image2,
                target_size,
            ),
        )

        return image1, image2
