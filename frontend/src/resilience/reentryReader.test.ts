import { describe, expect, it } from "vitest";
import JSZip from "jszip";

import { readSessionFile } from "./reentryReader";

describe("reentryReader", () => {

    it("reads a valid session file", async () => {

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

        const image1 = new Blob(
            ["image 1 content"],
            { type: "image/png"}
        );

        const image2 = new Blob(
            ["image 2 content"],
            { type: "image/png"}
        );


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

        const result = await readSessionFile(blob);

        expect(result.session).toEqual(session);

        expect(result.image1).toBeInstanceOf(Blob);

        expect(result.image2).toBeInstanceOf(Blob);

        expect(await result.image1.text()).toBe("image 1 content");

        expect(await result.image2.text()).toBe("image 2 content");

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
            readSessionFile(blob)
        ).rejects.toThrow(
            "Missing operation.json"
        );
    });


    it("rejects an invalid zip file", async () => {

        const invalidFile = new Blob([
            "this is not a zip file",
        ]);

        await expect(
            readSessionFile(invalidFile)
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
        readSessionFile(blob)
    ).rejects.toThrow(
        "Missing image 1"
        );

    });


});
