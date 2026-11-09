import { describe, expect, it } from "vitest";

import {
    SESSION_VERSION,
    type SessionFile,
} from "../types/session";

import { createPngBlob } from "./pngTestFixture";

import { reconstructFiles } from "./reconstructor";

describe("reconstructor", () => {

    it("reconstructs files from session metadata and images", async () => {

        const session: SessionFile = {
            id: "test-session",
            operation: "blend",
            dimensions: {
                width: 800,
                height: 600,
            },
            version: SESSION_VERSION,
            metadata: {
                image_1: {
                    name: "image1.jpg",
                    type: "image/jpeg",
                    size: 1000,
                },
                image_2: {
                    name: "image2.jpg",
                    type: "image/jpeg",
                    size: 1200,
                },
                laboratoryPhase: "processing",
                operationPhase: "running",
            },
        };

        const image1 = createPngBlob();
        const image2 = createPngBlob();

        const result = reconstructFiles({
            session,
            image1,
            image2,
        });

        expect(result.firstFile).toBeInstanceOf(File);
        expect(result.secondFile).toBeInstanceOf(File);

        expect(result.firstFile.name).toBe("image1.jpg");
        expect(result.secondFile.name).toBe("image2.jpg");

        expect(result.firstFile.type).toBe("image/png");
        expect(result.secondFile.type).toBe("image/png");

        expect(new Uint8Array(await result.firstFile.arrayBuffer())
            ).toEqual( new Uint8Array(await image1.arrayBuffer()));

        expect(new Uint8Array(await result.secondFile.arrayBuffer())
            ).toEqual( new Uint8Array(await image2.arrayBuffer()));

    });

    it("reconstructs image_1 without name", async () => {

        const session: SessionFile = {
            id: "test-session",
            operation: "blend",
            dimensions: {
                width: 800,
                height: 600,
            },
            version:SESSION_VERSION,
            metadata: {
                image_1: {
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

        const result = reconstructFiles({
            session,
            image1,
            image2,
        });

        expect(result.firstFile.name).toBe("image_1.png");
        expect(result.secondFile.name).toBe("image2.png");

    });

    it("reconstructs image_2 without name", async () => {

        const session: SessionFile = {
            id: "test-session",
            operation: "blend",
            dimensions: {
                width: 800,
                height: 600,
            },
            version:SESSION_VERSION,
            metadata: {
                image_1: {
                    name: "image1.png",
                    type: "image/png",
                    size: 1000,
                },
                image_2: {
                    type: "image/png",
                    size: 1200,
                },
                laboratoryPhase: "processing",
                operationPhase: "running",
            },
        };

        const image1 = createPngBlob();

        const image2 = createPngBlob();

        const result = reconstructFiles({
            session,
            image1,
            image2,
        });

        expect(result.firstFile.name).toBe("image1.png");
        expect(result.secondFile.name).toBe("image_2.png");

    });

    it("reconstructs images without name", async () => {

        const session: SessionFile = {
            id: "test-session",
            operation: "blend",
            dimensions: {
                width: 800,
                height: 600,
            },
            version: SESSION_VERSION,
            metadata: {
                image_1: {
                    type: "image/png",
                    size: 1000,
                },
                image_2: {
                    type: "image/png",
                    size: 1200,
                },
                laboratoryPhase: "processing",
                operationPhase: "running",
            },
        };

        const image1 = createPngBlob();
        const image2 = createPngBlob();

        const result = reconstructFiles({
            session,
            image1,
            image2,
        });

        expect(result.firstFile.name).toBe("image_1.png");
        expect(result.secondFile.name).toBe("image_2.png");

    });



});
