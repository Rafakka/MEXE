import { describe, expect, it } from "vitest";
import JSZip from "jszip";

import { SessionValidator } from "./sessionValidator";

import { SESSION_VERSION } from "../types/session";

import { createPngBlob } from "../resilience/pngTestFixture";

const validator =  new SessionValidator();

describe("SessionValidator", () => {

    it("reads a valid session file", async () => {

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

        const image1 = createPngBlob();

        const image2 = createPngBlob();

        const zip = new JSZip();

        zip.file(
            "operation.json",
            JSON.stringify(session)
        );

        zip.file(
            "image_1.png",
            image1
        );

        zip.file(
            "image_2.png",
            image2
        );


        const blob = await zip.generateAsync({
            type: "blob",
        });

        const result = await validator.validateFile(blob);

        expect(result.session).toEqual(session);

        expect( new Uint8Array(await result.image1.arrayBuffer())
        ).toEqual(
        new Uint8Array(await image1.arrayBuffer())
        );

        expect(
        new Uint8Array(await result.image2.arrayBuffer())
        ).toEqual(
        new Uint8Array(await image2.arrayBuffer())
        );


    });


    it("rejects a session file without operation.json", async () => {

        const zip = new JSZip();

        zip.file(
            "other.json",
            JSON.stringify({
                test: true,
            })
        );

        const blob = await zip.generateAsync({
            type: "blob",
        });

        await expect(
            validator.validateFile(blob)
        ).rejects.toThrow(
            "Missing required session file: operation.json"
        );
    });


    it("rejects an invalid zip file", async () => {

        const invalidFile = new Blob([
            "this is not a zip file",
        ]);

        await expect(
            validator.validateFile(invalidFile)
        ).rejects.toThrow();
    });

    it("rejects a session file without image_1", async () => {

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

    zip.file(
        "operation.json",
        JSON.stringify(session)
    );

    zip.file(
        "image_2.png",
        new Blob(
            ["image 2 content"],
            { type: "image/png" }
        )
    );

    const blob = await zip.generateAsync({
        type: "blob",
    });

    await expect(
        validator.validateFile(blob)
    ).rejects.toThrow(
        "Missing required session file: image_1.png"
        );

    });


});
