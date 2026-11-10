


import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";

import { configureStore } from "@reduxjs/toolkit";

import JSZip from "jszip";

import laboratoryReducer from "../features/laboratory/laboratorySlice";

import {
    saveSession,
} from "./saveSession";

import {
    validateAndProcessReentry,
    manualReentry,
} from "../features/laboratory/laboratoryThunks";

import {
    memorizeProcess,
    forgetProcess,
    getMemorizedProcess,
} from "../resilience/resilienceMemory";

import {
    registerProcess,
    unregisterProcess,
} from "../resilience/processRegistry";

import {
    createPngBlob,
} from "../resilience/pngTestFixture";

import type {
    ProcessResult,
} from "../resilience/processRegistry";


describe("session round trip integration", () => {

    const png = createPngBlob();

    const firstFile = new File(
        [png],
        "first.png",
        { type: "image/png" }
    );

    const secondFile = new File(
        [png],
        "second.png",
        { type: "image/png" }
    );

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

        const canvas = {
            width: 0,
            height: 0,

            getContext: vi.fn(() => ({
                drawImage: vi.fn(),
            })),

            toBlob: vi.fn(
                (callback: BlobCallback) => {
                    callback(createPngBlob());
                }
            ),
        };

        vi.stubGlobal("Image", MockImage);

        vi.stubGlobal("URL", {
            createObjectURL: vi.fn(
                () => "blob:test-image"
            ),
            revokeObjectURL: vi.fn(),
        });

        vi.stubGlobal("document", {
            createElement: vi.fn(
                () => canvas
            ),
        });
    }

    beforeEach(() => {
        configureBrowserMocks();
        forgetProcess();
    });

    afterEach(() => {
        forgetProcess();
        unregisterProcess("blend");

        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it("exports, loses volatile context, reconstructs and resumes the session", async () => {

        const handler = vi.fn(
            async (): Promise<ProcessResult> => "success"
        );

        registerProcess("blend", handler);

        // 1. Simulate an interrupted operation.

        const interruptedProcess = {
            type: "blend" as const,
            phase: "processing" as const,
            operationPhase: "running" as const,
        };

        memorizeProcess(interruptedProcess);

        expect(getMemorizedProcess())
            .toEqual(interruptedProcess);

        // 2. Export the interrupted session.

        const exported = await saveSession(
            firstFile,
            secondFile
        );

        expect(exported.file)
            .toBeInstanceOf(Blob);

        expect(exported.id)
            .toBeTruthy();

        // 3. Inspect the actual exported archive.

        const zip = await JSZip.loadAsync(
            exported.file
        );

        expect(Object.keys(zip.files).sort())
            .toEqual([
                "image_1.png",
                "image_2.png",
                "operation.json",
            ]);

        const operationJson = await zip
            .file("operation.json")!
            .async("string");

        const session = JSON.parse(operationJson);

        expect(session.id).toBe(exported.id);
        expect(session.operation).toBe("blend");

        expect(session.metadata.laboratoryPhase)
            .toBe("processing");

        expect(session.metadata.operationPhase)
            .toBe("running");

        // 4. Simulate loss of volatile application memory.

        forgetProcess();

        expect(getMemorizedProcess()).toBeNull();

        // 5. Validate and reconstruct the exported session.

        const reconstructed = await validateAndProcessReentry(
            exported.file
        )();

        expect(reconstructed.operation)
            .toBe("blend");

        expect(reconstructed.firstFile)
            .toBeInstanceOf(File);

        expect(reconstructed.secondFile)
            .toBeInstanceOf(File);

        expect(reconstructed.firstFile.name)
            .toBe("image_1.png");

        expect(reconstructed.secondFile.name)
            .toBe("image_2.png");

        expect(getMemorizedProcess())
            .toEqual(interruptedProcess);

        // 6. Resume through the real manual reentry thunk.

        const testStore = configureStore({
            reducer: {
                laboratory: laboratoryReducer,
            },
        });

        const result = await testStore.dispatch(
            manualReentry(
                reconstructed.operation,
                reconstructed.firstFile,
                reconstructed.secondFile
            )
        );

        // 7. Verify the complete recovery.

        expect(result).toBe("success");

        expect(handler).toHaveBeenCalledOnce();

        expect(handler).toHaveBeenCalledWith(
            reconstructed.firstFile,
            reconstructed.secondFile
        );

        expect(getMemorizedProcess()).toBeNull();

        expect(
            testStore.getState().laboratory.operationPhase
        ).toBe("revealing");

    });

});

