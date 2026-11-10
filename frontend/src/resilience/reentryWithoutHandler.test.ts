
import { afterEach, describe, expect, it } from "vitest";
import JSZip from "jszip";

import { SESSION_VERSION } from "../types/session";

import {
    validateAndProcessReentry,
} from "../features/laboratory/laboratoryThunks";

import {
    memorizeProcess,
    getMemorizedProcess,
    forgetProcess,
} from "./resilienceMemory";

import {
    unregisterProcess,
} from "./processRegistry";

import { createPngBlob } from "./pngTestFixture";

afterEach(() => {
    forgetProcess();
    unregisterProcess("blend");
});

describe("reentry without registered handler", () => {

    it("does not memorize a new process when its handler is unavailable", async () => {

        // 1. Preserve an existing interrupted process
        const existingProcess = {
            type: "blend" as const,
            phase: "processing" as const,
            operationPhase: "offline" as const,
        };

        memorizeProcess(existingProcess);

        // 2. Build a structurally valid session
        const image1 = createPngBlob();
        const image2 = createPngBlob();

        const session = {
            id: "valid-session-without-handler",
            operation: "blend",
            dimensions: {
                width: 800,
                height: 600,
            },
            version: SESSION_VERSION,
            metadata: {
                image_1: {
                    name: "image1.png",
                    type: "image/png",
                    size: 1000,
                },
                image_2: {
                    name: "image2.png",
                    type: "image/png",
                    size: 1200,
                },
                laboratoryPhase: "processing",
                operationPhase: "running",
            },
        };

        const zip = new JSZip();

        zip.file("image_1.png", image1);
        zip.file("image_2.png", image2);
        zip.file("operation.json", JSON.stringify(session));

        const mxFile = await zip.generateAsync({
            type: "blob",
        });

        // 3. Ensure no handler is registered
        unregisterProcess("blend");

        // 4. Attempt reentry
        await expect(
            validateAndProcessReentry(mxFile)()
        ).rejects.toThrow(
            "No registered handler for operation: blend"
        );

        // 5. The original process must remain untouched
        expect(getMemorizedProcess()).toEqual(existingProcess);

    });

});

