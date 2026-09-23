

import { describe, expect, it, vi, afterEach } from "vitest";
import JSZip from "jszip";

import { validateAndProcessReentry } from "../../src/features/laboratory/laboratoryThunks";

import { getMemorizedProcess, forgetProcess } from "../../src/resilience/resilienceMemory";

    afterEach(() => {
    forgetProcess();
    });

describe("validateAndProcessReentry", () => {

    it("reconstructs a valid session for reentry", async () => {

        const session = {
            id: "test-session",
            operation: "blend",
            dimensions: {
                width: 800,
                height: 600,
            },
            version: "1.0.0",
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

        zip.file(
            "operation.json",
            JSON.stringify(session)
        );

        zip.file(
            "image_1.png",
            new Blob(
                ["image 1 content"],
                { type: "image/png" }
            )
        );

        zip.file(
            "image_2.png",
            new Blob(
                ["image 2 content"],
                { type: "image/png" }
            )
        );

        const mxFile = await zip.generateAsync({
            type: "blob",
        });

        const mockDispatch = vi.fn();

        const result = await validateAndProcessReentry(
            mxFile
        )(mockDispatch);

        const memorized = getMemorizedProcess();

        expect(memorized).toEqual(result.recoveryProcess);

        expect(result.session).toEqual(session);

        expect(result.firstFile).toBeInstanceOf(File);
        expect(result.secondFile).toBeInstanceOf(File);

        expect(result.firstFile.name).toBe("image1.png");
        expect(result.secondFile.name).toBe("image2.png");

        expect(
            await result.firstFile.text()
        ).toBe("image 1 content");

        expect(
            await result.secondFile.text()
        ).toBe("image 2 content");
    });

});
