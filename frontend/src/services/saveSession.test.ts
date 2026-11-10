


import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";

import JSZip from "jszip";

import { saveSession } from "./saveSession";
import { SessionValidator } from "./sessionValidator";

import {
    forgetProcess,
    getMemorizedProcess,
    memorizeProcess,
} from "../resilience/resilienceMemory";

import { SESSION_VERSION } from "../types/session";
import { createPngBlob } from "../resilience/pngTestFixture";


// --------------------------------------------------
// Browser API mocks
// --------------------------------------------------

class MockImage {
    naturalWidth = 64;
    naturalHeight = 32;

    onload: ((event: Event) => void) | null = null;
    onerror: ((event: Event) => void) | null = null;

    set src(_value: string) {
        queueMicrotask(() => {
            this.onload?.(new Event("load"));
        });
    }
}

function configureBrowserMocks() {

    vi.stubGlobal("Image", MockImage);

    vi.stubGlobal("URL", {
        createObjectURL: vi.fn(() => "blob:mock-image"),
        revokeObjectURL: vi.fn(),
    });

    vi.stubGlobal("document", {
        createElement: vi.fn((tag: string) => {

            if (tag !== "canvas") {
                throw new Error(`Unexpected element: ${tag}`);
            }

            return {
                width: 0,
                height: 0,

                getContext: vi.fn(() => ({
                    drawImage: vi.fn(),
                })),

                toBlob: (
                    callback: BlobCallback,
                    _type?: string
                ) => {
                    callback(createPngBlob());
                },
            } as unknown as HTMLCanvasElement;

        }),
    });
}


// --------------------------------------------------
// Test fixtures
// --------------------------------------------------

function createImageFile(name: string): File {

    return new File(
        [createPngBlob()],
        name,
        {
            type: "image/png",
        }
    );
}

const firstFile = createImageFile("first.png");
const secondFile = createImageFile("second.png");

const interruptedProcess = {
    type: "blend" as const,
    phase: "processing" as const,
    operationPhase: "running" as const,
};

const expectedPngSignature = [
    0x89,
    0x50,
    0x4E,
    0x47,
    0x0D,
    0x0A,
    0x1A,
    0x0A,
];


// --------------------------------------------------
// Helpers
// --------------------------------------------------

async function readZip(blob: Blob): Promise<JSZip> {
    return JSZip.loadAsync(blob);
}

async function readZipFile(
    zip: JSZip,
    filename: string
): Promise<string> {

    const file = zip.file(filename);

    if (!file) {
        throw new Error(`Missing ZIP entry: ${filename}`);
    }

    return file.async("string");
}

async function readZipBlob(
    zip: JSZip,
    filename: string
): Promise<Blob> {

    const file = zip.file(filename);

    if (!file) {
        throw new Error(`Missing ZIP entry: ${filename}`);
    }

    return file.async("blob");
}

async function expectValidPng(blob: Blob) {

    const bytes = new Uint8Array(
        await blob.arrayBuffer()
    );

    expect(
        Array.from(bytes.slice(0, 8))
    ).toEqual(expectedPngSignature);
}


// --------------------------------------------------
// Tests
// --------------------------------------------------

describe("saveSession", () => {

    beforeEach(() => {

        configureBrowserMocks();

        forgetProcess();

    });

    afterEach(() => {

        forgetProcess();

        vi.restoreAllMocks();

        vi.unstubAllGlobals();

    });


    // ----------------------------------------------
    // 1. Missing process
    // ----------------------------------------------

    it("rejects export when there is no memorized process", async () => {

        expect(getMemorizedProcess()).toBeNull();

        await expect(
            saveSession(firstFile, secondFile)
        ).rejects.toThrow(
            "No session available to save"
        );

    });


    // ----------------------------------------------
    // 2. Session metadata
    // ----------------------------------------------

    it("preserves the interrupted process in the exported session", async () => {

        memorizeProcess(interruptedProcess);

        const { file } = await saveSession(
            firstFile,
            secondFile
        );

        const zip = await readZip(file);

        const operationJson = await readZipFile(
            zip,
            "operation.json"
        );

        const session = JSON.parse(operationJson);

        expect(session.id).toBeTruthy();

        expect(session.operation).toBe("blend");

        expect(session.version).toBe(SESSION_VERSION);

        expect(session.dimensions).toEqual({
            width: 1024,
            height: 1024,
        });

        expect(session.metadata.laboratoryPhase)
            .toBe("processing");

        expect(session.metadata.operationPhase)
            .toBe("running");

        expect(session.metadata.image_1).toEqual({
            width: 64,
            height: 32,
            type: "image/png",
            size: firstFile.size,
        });

        expect(session.metadata.image_2).toEqual({
            width: 64,
            height: 32,
            type: "image/png",
            size: secondFile.size,
        });

    });


    // ----------------------------------------------
    // 3. ZIP structure
    // ----------------------------------------------

    it("generates a ZIP containing all required MX files", async () => {

        memorizeProcess(interruptedProcess);

        const { file } = await saveSession(
            firstFile,
            secondFile
        );

        const zip = await readZip(file);

        const entries = Object.keys(zip.files)
            .filter(name => !zip.files[name].dir)
            .sort();

        expect(entries).toEqual([
            "image_1.png",
            "image_2.png",
            "operation.json",
        ]);

    });


    // ----------------------------------------------
    // 4. PNG integrity
    // ----------------------------------------------

    it("exports both images with valid PNG signatures", async () => {

        memorizeProcess(interruptedProcess);

        const { file } = await saveSession(
            firstFile,
            secondFile
        );

        const zip = await readZip(file);

        const image1 = await readZipBlob(
            zip,
            "image_1.png"
        );

        const image2 = await readZipBlob(
            zip,
            "image_2.png"
        );

        await expectValidPng(image1);

        await expectValidPng(image2);

    });


    // ----------------------------------------------
    // 5. Session validation
    // ----------------------------------------------

    it("generates an MX file accepted by SessionValidator", async () => {

        memorizeProcess(interruptedProcess);

        const { file } = await saveSession(
            firstFile,
            secondFile
        );

        const validator = new SessionValidator();

        const result = await validator.validateFile(file);

        expect(result.session.operation).toBe("blend");

        expect(result.session.version).toBe(SESSION_VERSION);

        expect(result.session.metadata.laboratoryPhase)
            .toBe("processing");

        expect(result.session.metadata.operationPhase)
            .toBe("running");

        await expectValidPng(result.image1);

        await expectValidPng(result.image2);

    });


    // ----------------------------------------------
    // 6. Image integrity
    // ----------------------------------------------

    it("preserves the exported image contents", async () => {

        memorizeProcess(interruptedProcess);

        const { file } = await saveSession(
            firstFile,
            secondFile
        );

        const zip = await readZip(file);

        const image1 = await readZipBlob(
            zip,
            "image_1.png"
        );

        const image2 = await readZipBlob(
            zip,
            "image_2.png"
        );

        const expectedImage = createPngBlob();

        const expectedBytes = new Uint8Array(
            await expectedImage.arrayBuffer()
        );

        const actualImage1 = new Uint8Array(
            await image1.arrayBuffer()
        );

        const actualImage2 = new Uint8Array(
            await image2.arrayBuffer()
        );

        expect(actualImage1).toEqual(expectedBytes);

        expect(actualImage2).toEqual(expectedBytes);

    });


    // ----------------------------------------------
    // 7. Full round-trip validation
    // ----------------------------------------------

    it("exports a session that can be read back without losing its data", async () => {

        memorizeProcess(interruptedProcess);

        const { file, id } = await saveSession(
            firstFile,
            secondFile
        );

        const validator = new SessionValidator();

        const restored = await validator.validateFile(file);

        expect(restored.session.id).toBe(id);

        expect(restored.session.operation).toBe("blend");

        expect(restored.session.metadata).toEqual({
            image_1: {
                width: 64,
                height: 32,
                type: "image/png",
                size: firstFile.size,
            },

            image_2: {
                width: 64,
                height: 32,
                type: "image/png",
                size: secondFile.size,
            },

            laboratoryPhase: "processing",

            operationPhase: "running",
        });

        expect(restored.image1.size).toBeGreaterThan(0);

        expect(restored.image2.size).toBeGreaterThan(0);

    });

});

