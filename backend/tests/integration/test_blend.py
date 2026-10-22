

from PIL import Image

from io import BytesIO

import app.infra.validators.input_validator as validator_module

def test_blend(client):

    data = {
            "width":500,
            "height":300,
            }

    img1 = Image.new('RGB',(800,600),(255,255,255))

    buffer1 = BytesIO()

    img1.save(buffer1, format="PNG")

    buffer1.seek(0)

    img2 = Image.new('RGBA',(500,500),(255,0,0,255))

    buffer2 = BytesIO()

    img2.save(buffer2, format="PNG")

    buffer2.seek(0)

    images = {
              "implicit_image_a":("img1.png",buffer1),
              "implicit_image_b":("img2.png",buffer2)
              }

    blended_img = client.post(
            "/blend",
            files=images,
            data=data
            )

    assert blended_img.status_code == 200

def png_payload(size, color=(255, 0, 0, 255)):
    image = Image.new("RGBA", size, color)
    buffer = BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()


def post_blend(client, image_a, image_b, width=2, height=2):
    return client.post(
        "/blend",
        files={
            "implicit_image_a": ("a.png", image_a, "image/png"),
            "implicit_image_b": ("b.png", image_b, "image/png"),
        },
        data={"width": width, "height": height},
    )


def test_blend_rejects_an_individual_upload_over_limit(client, monkeypatch):
    small = png_payload((1, 1))
    large = png_payload((64, 64))
    assert len(large) > len(small)

    # The first file is exactly at the limit; the second file exceeds it.
    monkeypatch.setattr(validator_module, "MAX_UPLOAD_SIZE_BYTES", len(small))
    response = post_blend(client, small, large)

    assert response.status_code == 413
    assert response.json()["detail"] == "Uploaded file is too large"


def test_blend_limit_is_per_file_not_sum_of_both_uploads(client, monkeypatch):
    payload = png_payload((2, 2))
    monkeypatch.setattr(validator_module, "MAX_UPLOAD_SIZE_BYTES", len(payload))

    # Each image is at the limit, even though their combined bytes exceed it.
    response = post_blend(client, payload, payload)

    assert response.status_code == 200


def test_blend_rejects_input_pixels_over_limit(client, monkeypatch):
    monkeypatch.setattr(validator_module, "MAX_IMAGE_PIXELS", 8)

    response = post_blend(
        client,
        png_payload((3, 3)),  # 9 pixels: rejected
        png_payload((2, 2)),  # 4 pixels: valid
    )

    assert response.status_code == 413
    assert response.json()["detail"] == "Image contains too many pixels"


def test_blend_rejects_input_width_over_limit(client, monkeypatch):
    monkeypatch.setattr(validator_module, "MAX_IMAGE_WIDTH", 2)

    response = post_blend(
        client,
        png_payload((3, 2)),  # width 3: rejected
        png_payload((2, 2)),
    )

    assert response.status_code == 413
    assert response.json()["detail"] == "Image width exceeds the maximum allowed"


def test_blend_rejects_input_height_over_limit(client, monkeypatch):
    monkeypatch.setattr(validator_module, "MAX_IMAGE_HEIGHT", 2)

    response = post_blend(
        client,
        png_payload((2, 3)),  # height 3: rejected
        png_payload((2, 2)),
    )

    assert response.status_code == 413
    assert response.json()["detail"] == "Image height exceeds the maximum allowed"


def test_blend_rejects_output_pixels_over_limit(client, monkeypatch):
    monkeypatch.setattr(validator_module, "MAX_IMAGE_PIXELS", 4)

    response = post_blend(
        client,
        png_payload((2, 2)),
        png_payload((2, 2)),
        width=3,
        height=2,  # 6 output pixels: rejected before normalization
    )

    assert response.status_code == 413
    assert response.json()["detail"] == "Output image contains too many pixels"


def test_blend_rejects_non_positive_output_dimensions(client):
    response = post_blend(
        client,
        png_payload((2, 2)),
        png_payload((2, 2)),
        width=0,
        height=2,
    )

    assert response.status_code == 422
    assert response.json()["detail"] == "Output dimensions must be positive"

