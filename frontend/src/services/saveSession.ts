
import type { SessionFile } from "../../src/types/session";
import { getImageMetadata } from "../../src/features/laboratory/utils/getImageMetadata";
import { getMemorizedProcess } from "../../src/resilience/resilienceMemory";
import { SessionValidator } from "./sessionValidator";
import { saveSessionFiles } from "./saveSessionFiles";


export async function saveSession(
    firstFile: File,
    secondFile: File
) {

    const process = getMemorizedProcess();

    if (!process) {
        throw new Error("No session available to save");
    }

    const image1Metadata =
        await getImageMetadata(firstFile);

    const image2Metadata =
        await getImageMetadata(secondFile);

    const session: SessionFile = {

        id: crypto.randomUUID(),

        operation: process.type,

        dimensions: {
            width: 1024,
            height: 1024,
        },

        version: "1.0",

        metadata: {

            image_1: image1Metadata,

            image_2: image2Metadata,

            laboratoryPhase: process.phase,

            operationPhase: process.operationPhase,

        },
    };

    const validator = new SessionValidator();

    validator.validateSession(session);

    const mxFile = await saveSessionFiles(
        session,
        firstFile,
        secondFile,
    )

    return {
        file: mxFile,
        id: session.id,
    }
}
