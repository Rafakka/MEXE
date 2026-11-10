

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureStore } from "@reduxjs/toolkit";

import laboratoryReducer from "../features/laboratory/laboratorySlice";
import { manualRetry } from "../features/laboratory/laboratoryThunks";

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

import { recoverConnection } from "./connectionRecovery";

vi.mock("./connectionRecovery", () => ({
    recoverConnection: vi.fn(),
}));

const mockedRecoverConnection = vi.mocked(recoverConnection);

function createTestStore() {
    return configureStore({
        reducer: {
            laboratory: laboratoryReducer,
        },
    });
}

describe("recovery after offline state", () => {

    const existingProcess = {
        type: "blend" as const,
        phase: "processing" as const,
        operationPhase: "running" as const,
    };

    const firstFile = new File(["first"], "first.png");
    const secondFile = new File(["second"], "second.png");

    const handler = vi.fn(
        async (): Promise<ProcessResult> => "success"
    );

    let testStore: ReturnType<typeof createTestStore>;

    beforeEach(() => {
        forgetProcess();
        unregisterProcess("blend");

        mockedRecoverConnection.mockReset();
        handler.mockClear();

       testStore = createTestStore();

        registerProcess("blend", handler);
        memorizeProcess(existingProcess);
    });

    afterEach(() => {
        forgetProcess();
        unregisterProcess("blend");
    });

    it("preserves the interrupted process after failed recovery and resumes it after a later successful recovery", async () => {

        // 1. First connection recovery fails
        mockedRecoverConnection.mockResolvedValueOnce(false);

        const firstAttempt = await testStore.dispatch(
            manualRetry(firstFile, secondFile)
        );

        expect(firstAttempt).toBe("failed");

        // The process must remain available
        expect(getMemorizedProcess()).toEqual(existingProcess);

        // The operation handler must not execute without a connection
        expect(handler).not.toHaveBeenCalled();

        expect(
            testStore.getState().laboratory.operationPhase
        ).toBe("offline");

        // 2. A later connection recovery succeeds
        mockedRecoverConnection.mockResolvedValueOnce(true);

        const secondAttempt = await testStore.dispatch(
            manualRetry(firstFile, secondFile)
        );

        expect(secondAttempt).toBe("success");

        // 3. The original process must execute exactly once
        expect(handler).toHaveBeenCalledOnce();

        expect(handler).toHaveBeenCalledWith(
            firstFile,
            secondFile
        );

        // 4. Successful recovery must clear the memorized process
        expect(getMemorizedProcess()).toBeNull();

        // 5. Both connection attempts must have occurred
        expect(mockedRecoverConnection).toHaveBeenCalledTimes(2);

    });

});

