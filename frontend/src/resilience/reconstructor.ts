

import type { SessionFile } from "../../src/types/session";

export type ReconstructedFiles = {
    firstFile : File;
    secondFile: File;
};

export type ReconstructorInput = {
    session: SessionFile;
    image1: Blob;
    image2: Blob;
};

export function reconstructFiles({
    session,
    image1,
    image2,
}: ReconstructorInput): ReconstructedFiles {

    const firstFile = new File(
        [image1],
        session.metadata.image_1.name ?? "image_1.png",
        {
            type: session.metadata.image_1.type,
        }
    );

    const secondFile = new File(
        [image2],
        session.metadata.image_2.name ?? "image_2.png",
        {
            type: session.metadata.image_2.type,
        }
    );

    return {
        firstFile,
        secondFile,
    };
}
