
import JSZip from "jszip"

import type { SessionFile } from "../../src/types/session";

import { SessionValidator } from "./sessionValidator";

async function convertToPng(file: File): Promise<Blob> {

    const url = URL.createObjectURL(file);

    try {

        const image = new Image();

        image.src = url;

        await new Promise<void>((resolve, reject) => {

            image.onload = () => resolve();

            image.onerror = () =>
                reject(
                    new Error("Could not load image")
                );

        });

        const canvas = document.createElement("canvas");

        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;

        const context = canvas.getContext("2d");

        if (!context) {
            throw new Error("Could not create canvas context");
        }

        context.drawImage(
            image,
            0,
            0
        );

        const png = await new Promise<Blob | null>(
            (resolve) =>
                canvas.toBlob(
                    resolve,
                    "image/png"
                )
        );

        if (!png) {
            throw new Error("Could not convert image to PNG");
        }

        return png;

    } finally {

        URL.revokeObjectURL(url);

    }
}

export async function saveSessionFiles(
    session: SessionFile,
    firstFile: File,
    secondFile: File
): Promise<Blob> {

    const zip = new JSZip();

    const operationJson = JSON.stringify(
        session,
        null,
        2
    );

    const image1Png = await convertToPng(firstFile);
    const image2Png = await convertToPng(secondFile);

    zip.file(
        "operation.json",
        operationJson
    );

    zip.file(
        "image_1.png",
        image1Png
    );

    zip.file(
        "image_2.png",
        image2Png
    );

    const blob = await zip.generateAsync({
        type: "blob"
    });

    const validator = new SessionValidator();

    await validator.validateFile(blob);

    return blob;

}
