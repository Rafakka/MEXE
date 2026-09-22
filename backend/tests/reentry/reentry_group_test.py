
from fastapi.testclient import TestClient

import io
import zipfile
import json
import pytest

from PIL import Image
from io import BytesIO

from app.main import app
from app.domain.file_status import ReentryState
from app.domain.reentry_file_checker import ReentryFile
from app.services.image_processing_service import ImageProcessingService
from app.api.contracts.resume_model import ResumeModel

def test_valid_reentry_file(valid_mx):

    checker = ReentryFile()

    result = checker.check(valid_mx)

    assert result == ReentryState.VALID


def test_unsupported_version(
    valid_operation_data,
    build_mx,
):

    valid_operation_data["version"] = "2.0"

    checker = ReentryFile()

    result = checker.check(
        build_mx(valid_operation_data)
    )

    assert result == ReentryState.INVALID


def test_unsupported_operation(
    valid_operation_data,
    build_mx,
):

    valid_operation_data["operation"] = "blur"

    checker = ReentryFile()

    result = checker.check(
        build_mx(valid_operation_data)
    )

    assert result == ReentryState.INVALID

def test_blend_operation_is_supported(
    valid_operation_data,
    build_mx,
):

    valid_operation_data["operation"] = "blend"

    checker = ReentryFile()

    result = checker.check(
        build_mx(valid_operation_data)
    )

    assert result == ReentryState.VALID

def test_zero_width_is_invalid(
    valid_operation_data,
    build_mx,
):

    valid_operation_data["dimensions"]["width"] = 0

    checker = ReentryFile()

    result = checker.check(
        build_mx(valid_operation_data)
    )

    assert result == ReentryState.INVALID

def test_zero_height_is_invalid(
    valid_operation_data,
    build_mx,
):

    valid_operation_data["dimensions"]["height"] = 0

    checker = ReentryFile()

    result = checker.check(
        build_mx(valid_operation_data)
    )

    assert result == ReentryState.INVALID

def test_negative_height_is_invalid(
    valid_operation_data,
    build_mx,
):

    valid_operation_data["dimensions"]["height"] = -100

    checker = ReentryFile()

    result = checker.check(
        build_mx(valid_operation_data)
    )

    assert result == ReentryState.INVALID

def test_invalid_width_type(
    valid_operation_data,
    build_mx,
):

    valid_operation_data["dimensions"]["width"] = "1024"

    checker = ReentryFile()

    result = checker.check(
        build_mx(valid_operation_data)
    )

    assert result == ReentryState.INVALID

def test_negative_width_is_invalid(
    valid_operation_data,
    build_mx,
):

    valid_operation_data["dimensions"]["width"] = -100

    checker = ReentryFile()

    result = checker.check(
        build_mx(valid_operation_data)
    )

    assert result == ReentryState.INVALID

def test_invalid_height_type(
    valid_operation_data,
    build_mx,
):

    valid_operation_data["dimensions"]["height"] = "1024"

    checker = ReentryFile()

    result = checker.check(
        build_mx(valid_operation_data)
    )

    assert result == ReentryState.INVALID

def test_missing_id(valid_operation_data, build_mx):
    del valid_operation_data["id"]

    checker = ReentryFile()
    result = checker.check(build_mx(valid_operation_data))

    assert result == ReentryState.INVALID

def test_invalid_dimensions_type(valid_operation_data, build_mx):
    valid_operation_data["dimensions"] = []

    checker = ReentryFile()
    result = checker.check(build_mx(valid_operation_data))

    assert result == ReentryState.INVALID

def test_missing_dimensions_width(valid_operation_data, build_mx):
    del valid_operation_data["dimensions"]["width"]

    checker = ReentryFile()
    result = checker.check(build_mx(valid_operation_data))

    assert result == ReentryState.INVALID

def test_missing_dimensions_height(valid_operation_data, build_mx):
    del valid_operation_data["dimensions"]["height"]

    checker = ReentryFile()
    result = checker.check(build_mx(valid_operation_data))

    assert result == ReentryState.INVALID

def test_invalid_operation_json(valid_png):
    buffer = io.BytesIO()

    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("operation.json", "{ invalid json")
        archive.writestr("image_1.png", valid_png)
        archive.writestr("image_2.png", valid_png)

    buffer.seek(0)

    checker = ReentryFile()
    result = checker.check(buffer)

    assert result == ReentryState.INVALID

def test_prepare_returns_resume_model(valid_operation_data, build_mx):
    checker = ReentryFile()
    file = build_mx(valid_operation_data)

    result = checker.prepare(file)

    assert result.id == "test-session"
    assert result.operation == "blend"
    assert result.width == 1024
    assert result.height == 1024
    assert result.version == "1.0"
    assert result.metadata == {}
    assert result.image_1
    assert result.image_2

def test_missing_operation_json(valid_png):
    buffer = io.BytesIO()

    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("image_1.png", valid_png)
        archive.writestr("image_2.png", valid_png)

    buffer.seek(0)

    checker = ReentryFile()
    result = checker.check(buffer)

    assert result == ReentryState.INVALID


def test_missing_image_1(valid_operation_data, valid_png):
    buffer = io.BytesIO()

    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as archive:
        archive.writestr(
            "operation.json",
            json.dumps(valid_operation_data),
        )
        archive.writestr("image_2.png", valid_png)

    buffer.seek(0)

    checker = ReentryFile()
    result = checker.check(buffer)

    assert result == ReentryState.INVALID


def test_missing_image_2(valid_operation_data, valid_png):
    buffer = io.BytesIO()

    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as archive:
        archive.writestr(
            "operation.json",
            json.dumps(valid_operation_data),
        )
        archive.writestr("image_1.png", valid_png)

    buffer.seek(0)

    checker = ReentryFile()
    result = checker.check(buffer)

    assert result == ReentryState.INVALID


def test_invalid_image_1(valid_operation_data, valid_png):
    buffer = io.BytesIO()

    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as archive:
        archive.writestr(
            "operation.json",
            json.dumps(valid_operation_data),
        )
        archive.writestr("image_1.png", b"not a png")
        archive.writestr("image_2.png", valid_png)

    buffer.seek(0)

    checker = ReentryFile()
    result = checker.check(buffer)

    assert result == ReentryState.INVALID


def test_invalid_image_2(valid_operation_data, valid_png):
    buffer = io.BytesIO()

    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as archive:
        archive.writestr(
            "operation.json",
            json.dumps(valid_operation_data),
        )
        archive.writestr("image_1.png", valid_png)
        archive.writestr("image_2.png", b"not a png")

    buffer.seek(0)

    checker = ReentryFile()
    result = checker.check(buffer)

    assert result == ReentryState.INVALID


def test_invalid_zip():
    buffer = io.BytesIO(b"this is not a zip file")

    checker = ReentryFile()
    result = checker.check(buffer)

    assert result == ReentryState.INVALID

def test_reentry_valid_file(valid_mx, monkeypatch):

    client = TestClient(app)

    async def fake_process(*args):
        return {"status": "processed"}

    monkeypatch.setattr(
        "app.api.routes.image_processor_sv.process",
        fake_process,
    )

    response = client.post(
        "/reentry",
        files={
            "file": (
                "session.mx",
                valid_mx,
                "application/octet-stream",
            )
        },
    )

    assert response.status_code == 200
    assert response.json() == {"status": "processed"}

def test_reentry_invalid_file_does_not_process(
    valid_operation_data,
    build_mx,
    monkeypatch,
):

    client = TestClient(app)

    process_called = False

    async def fake_process(*args):
        nonlocal process_called
        process_called = True
        return {"status": "processed"}

    monkeypatch.setattr(
        "app.api.routes.image_processor_sv.process",
        fake_process,
    )

    valid_operation_data["version"] = "2.0"

    mx_file = build_mx(valid_operation_data)

    response = client.post(
        "/reentry",
        files={
            "file": (
                "invalid.mx",
                mx_file,
                "application/octet-stream",
            )
        },
    )

    assert response.status_code == 422
    assert response.json()["detail"] == "Reentry File Invalid"
    assert process_called is False

def test_reentry_passes_prepared_operation_to_processor(
    valid_operation_data,
    build_mx,
    monkeypatch,
):

    client = TestClient(app)

    captured_operation = None
    captured_request_id = None

    async def fake_process(operation, request_id):
        nonlocal captured_operation
        nonlocal captured_request_id

        captured_operation = operation
        captured_request_id = request_id

        return {"status": "processed"}

    monkeypatch.setattr(
        "app.api.routes.image_processor_sv.process",
        fake_process,
    )

    mx_file = build_mx(valid_operation_data)

    response = client.post(
        "/reentry",
        files={
            "file": (
                "session.mx",
                mx_file,
                "application/octet-stream",
            )
        },
        headers={
            "X-Request-ID": "test-request-id",
        },
    )

    assert response.status_code == 200

    assert captured_operation is not None
    assert captured_operation.id == "test-session"
    assert captured_operation.operation == "blend"
    assert captured_operation.width == 1024
    assert captured_operation.height == 1024
    assert captured_operation.version == "1.0"
    assert captured_operation.metadata == {}
    assert captured_operation.image_1
    assert captured_operation.image_2

    assert captured_request_id == "test-request-id"

@pytest.mark.asyncio
async def test_image_processing_service_processes_resume_model(
    valid_png,
    monkeypatch,
):
    service = ImageProcessingService()

    operation = ResumeModel(
        id="test-session",
        operation="blend",
        image_1=valid_png,
        image_2=valid_png,
        width=1024,
        height=1024,
        version="1.0",
        metadata={},
    )

    prepared_images = ("image1", "image2")
    blended_image = "blended-image"
    encoded_result = b"encoded-result"

    def fake_prepare(received_operation):
        assert received_operation is operation
        return prepared_images

    def fake_blend(image1, image2, request_id):
        assert image1 == "image1"
        assert image2 == "image2"
        assert request_id == "test-request-id"
        return blended_image

    async def fake_encode(image):
        assert image == blended_image
        return encoded_result

    monkeypatch.setattr(
        service.image_preparation_service,
        "prepare",
        fake_prepare,
    )

    monkeypatch.setattr(
        service.blend_processor,
        "blend",
        fake_blend,
    )

    monkeypatch.setattr(
        service.image_encoder,
        "encode",
        fake_encode,
    )

    result = await service.process(
        operation,
        "test-request-id",
    )

    assert result == encoded_result

def test_reentry_processes_real_mx(valid_mx):

    client = TestClient(app)

    response = client.post(
        "/reentry",
        files={
            "file": (
                "session.mx",
                valid_mx,
                "application/octet-stream",
            )
        },
    )

    assert response.status_code == 200
    assert response.headers["content-type"] == "image/png"

    result_image = Image.open(BytesIO(response.content))

    assert result_image.size == (1024, 1024)

def test_reentry_without_file():

    client = TestClient(app)

    response = client.post("/reentry")

    assert response.status_code == 422


def test_reentry_with_invalid_file():

    client = TestClient(app)

    response = client.post(
        "/reentry",
        files={
            "file": (
                "invalid.mx",
                b"this is not a zip",
                "application/octet-stream",
            )
        },
    )

    assert response.status_code == 422
    assert response.json()["detail"] == "Reentry File Invalid"

@pytest.mark.asyncio
async def test_reentry_processing_failure(
    valid_mx,
    monkeypatch,
):

    client = TestClient(
            app,
            raise_server_exceptions=False,
            )

    async def fake_process(*args):
        raise RuntimeError("Processing failed")

    monkeypatch.setattr(
        "app.api.routes.image_processor_sv.process",
        fake_process,
    )

    response = client.post(
        "/reentry",
        files={
            "file": (
                "session.mx",
                valid_mx,
                "application/octet-stream",
            )
        },
    )

    assert response.status_code == 500


