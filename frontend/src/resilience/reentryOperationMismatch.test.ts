


import { afterEach, describe, expect, it, vi } from "vitest";
import { configureStore } from "@reduxjs/toolkit";

import laboratoryReducer from "../features/laboratory/laboratorySlice";

import { manualReentry } from "../features/laboratory/laboratoryThunks";

import {
    registerProcess,
    unregisterProcess,
    type ProcessResult,
} from "./processRegistry";

import {
    memorizeProcess,
    getMemorizedProcess,
    forgetProcess,
} from "./resilienceMemory";

afterEach(() => {
    forgetProcess();
    unregisterProcess("blend");
});

describe("reentry operation mismatch", () => {

    it("does not execute or discard a process when the requested operation differs", async () => {

        // 1. An interrupted blend process already exists
        const existingProcess = {
            type: "blend" as const,
            phase: "processing" as const,
            operationPhase: "running" as const,
        };

        memorizeProcess(existingProcess);

        // 2. Register the original process handler
        const handler = vi.fn(
            async (): Promise<ProcessResult> => "success"
        );

        registerProcess("blend", handler);

        // 3. Create Redux store
        const testStore = configureStore({
            reducer: {
                laboratory: laboratoryReducer,
            },
        });

        const firstFile = new File(["first"], "first.png");
        const secondFile = new File(["second"], "second.png");

        // 4. Request resize, although the memorized process is blend
        const result = await testStore.dispatch(
            manualReentry(
                "resize",
                firstFile,
                secondFile
            )
        );

        // 5. Reentry must be rejected
        expect(result).toBe("failed");

        // 6. Original handler must never execute
        expect(handler).not.toHaveBeenCalled();

        // 7. Original recovery process must remain intact
        expect(getMemorizedProcess()).toEqual(existingProcess);

        // 8. Laboratory must not enter the revealing phase
        expect(
            testStore.getState().laboratory.operationPhase
        ).toBe("idle");

    });

});

