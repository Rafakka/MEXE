

import { describe, expect, it, afterEach } from "vitest";
import JSZip from "jszip";

import { SESSION_VERSION } from "../types/session";

import { validateAndProcessReentry } from "../../src/features/laboratory/laboratoryThunks";

import { getMemorizedProcess, forgetProcess } from "../../src/resilience/resilienceMemory";

import {createPngBlob } from "./pngTestFixture";

    afterEach(() => {
    forgetProcess();
    });

describe("validateAndProcessReentry", () => {

    it("reconstructs a valid session for reentry", async () => {


        const image1 = createPngBlob();
        const image2 = createPngBlob();

        const session = {
            id: "test-session",
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

        zip.file(
            "operation.json",
            JSON.stringify(session)
        );

        const mxFile = await zip.generateAsync({
            type: "blob",
        });

        const result = await validateAndProcessReentry(
            mxFile
        )();

        const memorized = getMemorizedProcess();

        expect(memorized).toEqual(result.recoveryProcess);

        expect(result.session).toEqual(session);

        expect(result.firstFile).toBeInstanceOf(File);
        expect(result.secondFile).toBeInstanceOf(File);

        expect(result.firstFile.name).toBe("image1.png");
        expect(result.secondFile.name).toBe("image2.png");

        expect(new Uint8Array(await result.firstFile.arrayBuffer()) ).toEqual( new Uint8Array(await image1.arrayBuffer()));
        expect(new Uint8Array(await result.secondFile.arrayBuffer()) ).toEqual( new Uint8Array(await image2.arrayBuffer()));

    });

});
