import { ENDPOINTS } from "../api/endpoints";

export async function blendImages(
    imageA: File,
    imageB: File,
    width = 1024,
    height = 1024,
) {
    const formData = new FormData();

    formData.append("implicit_image_a", imageA);
    formData.append("implicit_image_b", imageB);

    formData.append("width", width.toString());
    formData.append("height", height.toString());

    const response = await fetch(
        ENDPOINTS.BLEND,
        {
            method: "POST",
            body: formData,
        },
    );

    if (!response.ok) {
        throw new Error(`Blend failed: ${response.status}`);
    }

    const blob = await response.blob();

    return URL.createObjectURL(blob);
}
