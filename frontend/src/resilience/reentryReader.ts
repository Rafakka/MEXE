import JSZip from "jszip";

import type { SessionFile } from "../types/session";

export type ReadSessionResult = {
    session: SessionFile,
    image1: Blob;
    image2: Blob;
};

export async function readSessionFile(
    file: Blob
): Promise<ReadSessionResult> {

    const zip = await JSZip.loadAsync(file);

    const operationFile = zip.file("operation.json");

    if (!operationFile) {
        throw new Error("Missing operation.json");
    }

    const image1File = zip.file("image_1.png");

    const image2File = zip.file("image_2.png");

    if (!image1File) {
        throw new Error("Missing image 1");
    }

    if (!image2File) {
        throw new Error("Missing image 2");
    }


    const content = await operationFile.async("string");

    const image1 = await image1File.async("blob");

    const image2 = await image2File.async("blob");

    const session = JSON. parse(content) as SessionFile;

    return {session, image1, image2};
}
