
import { configureStore } from "@reduxjs/toolkit";

import { describe, expect, it, afterEach, vi, } from "vitest";

import JSZip from "jszip";

import laboratoryReducer from "../features/laboratory/laboratorySlice";

import {
    manualReentry,
    validateAndProcessReentry,
} from "../features/laboratory/laboratoryThunks";

import {
    registerProcess,
    unregisterProcess,
    type ProcessResult,
} from "./processRegistry";


import { SESSION_VERSION } from "../types/session";

import { getMemorizedProcess, forgetProcess } from "../../src/resilience/resilienceMemory";

import {createPngBlob } from "./pngTestFixture";

    afterEach(() => {
    forgetProcess();
    unregisterProcess("blend");
    });

describe("reentry flow", () => {

    it("validates and resumes a session through ProcessRegistry", async () => {

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

        // 1. Register handler before validating the session
        const handler = vi.fn(
            async (): Promise<ProcessResult> => "success"
        );

        registerProcess("blend", handler);

        // 2. Validate and reconstruct session
        const result = await validateAndProcessReentry(mxFile)();

        // 3. Verify process was memorized
        expect(getMemorizedProcess()).toEqual(
            result.recoveryProcess
        );

        expect(result.session).toEqual(session);

        expect(result.firstFile).toBeInstanceOf(File);
        expect(result.secondFile).toBeInstanceOf(File);

        expect(result.firstFile.name).toBe("image1.png");
        expect(result.secondFile.name).toBe("image2.png");

        expect(result.firstFile.type).toBe("image/png");
        expect(result.secondFile.type).toBe("image/png");

        expect(result.operation).toBe("blend");

        // 4. Verify reconstructed image bytes
        expect(
            new Uint8Array(await result.firstFile.arrayBuffer())
        ).toEqual(
            new Uint8Array(await image1.arrayBuffer())
        );

        expect(
            new Uint8Array(await result.secondFile.arrayBuffer())
        ).toEqual(
            new Uint8Array(await image2.arrayBuffer())
        );

        // 5. Create Redux store
        const testStore = configureStore({
            reducer: {
                laboratory: laboratoryReducer,
            },
        });

        // 6. Execute reentry through ProcessRegistry
        const reentryResult = await testStore.dispatch(
            manualReentry(
                result.operation,
                result.firstFile,
                result.secondFile
            )
        );

        // 7. Verify registry execution
        expect(reentryResult).toBe("success");

        expect(handler).toHaveBeenCalledOnce();

        expect(handler).toHaveBeenCalledWith(
            result.firstFile,
            result.secondFile
        );

        // 8. Verify recovery memory was cleared
        expect(getMemorizedProcess()).toBeNull();

        // 9. Verify laboratory workflow continued
        expect(
            testStore.getState().laboratory.operationPhase
        ).toBe("revealing");

    });

});
