from io import BytesIO
import json
import zipfile

from PIL import Image

from app.domain.file_status import ReentryState
from app.api.contracts.resume_model import ResumeModel


class ReentryFile:

    def check(self, file) -> ReentryState:

        try:

            with zipfile.ZipFile(file) as archive:

                self._check_required_files(archive)

                data = self._read_data(archive)

                self._check_data(data)

                self._check_image(
                    archive,
                    "image_1.png"
                )

                self._check_image(
                    archive,
                    "image_2.png"
                )

            return ReentryState.VALID

        except Exception:

            return ReentryState.INVALID

    def _check_required_files(self, archive) -> None:

        files = archive.namelist()

        if "operation.json" not in files:
            raise ValueError("Missing operation.json")

        if "image_1.png" not in files:
            raise ValueError("Missing image_1.png")

        if "image_2.png" not in files:
            raise ValueError("Missing image_2.png")

    def _read_data(self, archive):

        try:

            content = archive.read("operation.json")

            return json.loads(content)

        except Exception:

            raise ValueError("Invalid operation.json")

    def _check_data(self, data) -> None:

        required_fields = [
            "id",
            "operation",
            "dimensions",
            "version",
            "metadata",
        ]

        for field in required_fields:

            if field not in data:
                raise ValueError(
                    f"Missing field: {field}"
                )

        dimensions = data["dimensions"]

        if "width" not in dimensions:
            raise ValueError("Missing dimensions.width")

        if "height" not in dimensions:
            raise ValueError("Missing dimensions.height")

    def _check_image(self, archive, filename) -> None:

        content = archive.read(filename)

        image = Image.open(BytesIO(content))

        image.verify()

    def prepare(self, file) -> ResumeModel:

        with zipfile.ZipFile(file) as archive:

            data = self._read_data(archive)

            image_1 = archive.read("image_1.png")
            image_2 = archive.read("image_2.png")

        return ResumeModel(
            id=data["id"],
            operation=data["operation"],
            image_1=image_1,
            image_2=image_2,
            width=data["dimensions"]["width"],
            height=data["dimensions"]["height"],
            version=data["version"],
            metadata=data["metadata"],
        )
