import { describe, expect, it } from "vitest";

import { reconstructFiles } from "./reconstructor";

import type {SessionFile} from "../types/session";

describe("reconstructor", () => {

    it("reconstructs files from session metadata and images", async () => {

        const session: SessionFile = {
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
            { type: "image/png" }
        );

        const image2 = new Blob(
            ["image 2 content"],
            { type: "image/png" }
        );

        const result = reconstructFiles({
            session,
            image1,
            image2,
        });

        expect(result.firstFile).toBeInstanceOf(File);
        expect(result.secondFile).toBeInstanceOf(File);

        expect(result.firstFile.name).toBe("image1.png");
        expect(result.secondFile.name).toBe("image2.png");

        expect(result.firstFile.type).toBe("image/png");
        expect(result.secondFile.type).toBe("image/png");

        expect(await result.firstFile.text()).toBe("image 1 content");
        expect(await result.secondFile.text()).toBe("image 2 content");
    });

    it("reconstructs image_1 without name", async () => {

        const session: SessionFile = {
            id: "test-session",
            operation: "blend",
            dimensions: {
                width: 800,
                height: 600,
            },
            version: "1.0.0",
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

        const image1 = new Blob(
            ["image 1 content"],
            { type: "image/png" }
        );

        const image2 = new Blob(
            ["image 2 content"],
            { type: "image/png" }
        );

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
            version: "1.0.0",
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

        const image1 = new Blob(
            ["image 1 content"],
            { type: "image/png" }
        );

        const image2 = new Blob(
            ["image 2 content"],
            { type: "image/png" }
        );

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
            version: "1.0.0",
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

        const image1 = new Blob(
            ["image 1 content"],
            { type: "image/png" }
        );

        const image2 = new Blob(
            ["image 2 content"],
            { type: "image/png" }
        );

        const result = reconstructFiles({
            session,
            image1,
            image2,
        });

        expect(result.firstFile.name).toBe("image_1.png");
        expect(result.secondFile.name).toBe("image_2.png");

    });



});
