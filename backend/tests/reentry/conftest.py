import io
import json
import zipfile

import pytest
from PIL import Image


@pytest.fixture
def valid_operation_data():
    return {
        "id": "test-session",
        "operation": "blend",
        "dimensions": {
            "width": 1024,
            "height": 1024,
        },
        "version": "1.0",
        "metadata": {},
    }


@pytest.fixture
def valid_png():
    image = Image.new("RGB", (10, 10), "white")

    buffer = io.BytesIO()
    image.save(buffer, format="PNG")

    return buffer.getvalue()


@pytest.fixture
def valid_mx(valid_operation_data, valid_png):
    buffer = io.BytesIO()

    with zipfile.ZipFile(
        buffer,
        "w",
        zipfile.ZIP_DEFLATED,
    ) as archive:

        archive.writestr(
            "operation.json",
            json.dumps(valid_operation_data),
        )

        archive.writestr(
            "image_1.png",
            valid_png,
        )

        archive.writestr(
            "image_2.png",
            valid_png,
        )

    buffer.seek(0)

    return buffer

@pytest.fixture
def build_mx(valid_png):
    def _build(operation_data):

        buffer = io.BytesIO()

        with zipfile.ZipFile(
            buffer,
            "w",
            zipfile.ZIP_DEFLATED,
        ) as archive:

            archive.writestr(
                "operation.json",
                json.dumps(operation_data),
            )

            archive.writestr(
                "image_1.png",
                valid_png,
            )

            archive.writestr(
                "image_2.png",
                valid_png,
            )

        buffer.seek(0)

        return buffer

    return _build


