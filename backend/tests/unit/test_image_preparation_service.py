from unittest.mock import Mock, call

import pytest
from fastapi import HTTPException
from types import SimpleNamespace

from app.api.contracts.resume_model import ResumeModel
from app.services.image_preparation_service import ImagePreparationService


def make_operation():
    return ResumeModel(
        id="test",
        operation="blend",
        image_1=b"image-a",
        image_2=b"image-b",
        width=2,
        height=2,
        version="1.0",
        metadata={},
    )


def make_preparation_service():
    service = ImagePreparationService()
    image_a = SimpleNamespace(width=2, height=2)
    image_b = SimpleNamespace(width=2, height=2)

    service.image_decoder.decode_bytes = Mock(
        side_effect=[image_a, image_b],
    )
    service.input_validator.check_pixels = Mock()
    service.input_validator.check_width = Mock()
    service.input_validator.check_height = Mock()
    service.input_validator.check_out_pixels = Mock()
    service.normalize_processor.normalize = Mock(
        side_effect=lambda image, target_size: image,
    )

    return service, image_a, image_b


def test_prepare_checks_both_inputs_and_output_before_normalization():
    service, image_a, image_b = make_preparation_service()

    result_a, result_b = service.prepare(make_operation())

    assert (result_a, result_b) == (image_a, image_b)
    service.image_decoder.decode_bytes.assert_has_calls([
        call(b"image-a"),
        call(b"image-b"),
    ])
    service.input_validator.check_pixels.assert_has_calls([
        call(image_a),
        call(image_b),
    ])
    service.input_validator.check_width.assert_has_calls([
        call(image_a),
        call(image_b),
    ])
    service.input_validator.check_height.assert_has_calls([
        call(image_a),
        call(image_b),
    ])
    service.input_validator.check_out_pixels.assert_called_once_with(2, 2)
    service.normalize_processor.normalize.assert_has_calls([
        call(image_a, (2, 2)),
        call(image_b, (2, 2)),
    ])


def test_prepare_does_not_normalize_after_input_validation_fails():
    service, image_a, _ = make_preparation_service()
    service.input_validator.check_pixels.side_effect = HTTPException(
        status_code=413,
        detail="Image contains too many pixels",
    )

    with pytest.raises(HTTPException) as exc:
        service.prepare(make_operation())

    assert exc.value.status_code == 413
    service.input_validator.check_pixels.assert_called_once_with(image_a)
    service.input_validator.check_out_pixels.assert_not_called()
    service.normalize_processor.normalize.assert_not_called()


def test_prepare_does_not_normalize_after_output_validation_fails():
    service, image_a, image_b = make_preparation_service()
    service.input_validator.check_out_pixels.side_effect = HTTPException(
        status_code=413,
        detail="Output image contains too many pixels",
    )

    with pytest.raises(HTTPException) as exc:
        service.prepare(make_operation())

    assert exc.value.status_code == 413
    service.input_validator.check_pixels.assert_has_calls([
        call(image_a),
        call(image_b),
    ])
    service.input_validator.check_out_pixels.assert_called_once_with(2, 2)
    service.normalize_processor.normalize.assert_not_called()
