import type { ImageMetadata } from "../../../types/imageType";

export function getImageMetadata(
    blob: Blob
): Promise<ImageMetadata> {

    return new Promise((resolve, reject) => {

        const url = URL.createObjectURL(blob);

        const image = new Image();

        image.onload = () => {

            resolve({

                width: image.naturalWidth,

                height: image.naturalHeight,

                type: blob.type,

                size: blob.size

            });

            URL.revokeObjectURL(url);

        };

        image.onerror = () => {

            URL.revokeObjectURL(url);

            reject(
                new Error("Could not read image metadata")
            );

        };

        image.src = url;

    });

}
