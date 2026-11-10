
import { afterEach, describe, expect, it, vi } from "vitest";
import { configureStore } from "@reduxjs/toolkit";

import laboratoryReducer from "../features/laboratory/laboratorySlice";
import {
    manualRetry,
    resetExperiment,
} from "../features/laboratory/laboratoryThunks";

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

afterEach(() => {
    forgetProcess();
    unregisterProcess("blend");
    vi.clearAllMocks();
});

describe("reset prevents stale recovery", () => {

    it("does not resume a process after it has been reset", async () => {

        // 1. Create the laboratory store
        const testStore = configureStore({
            reducer: {
                laboratory: laboratoryReducer,
            },
        });

        // 2. Register a handler and memorize an interrupted process
        const handler = vi.fn(
            async (): Promise<ProcessResult> => "success"
        );

        registerProcess("blend", handler);

        memorizeProcess({
            type: "blend",
            phase: "processing",
            operationPhase: "running",
        });

        expect(getMemorizedProcess()).not.toBeNull();

        // 3. Reset the experiment
        await testStore.dispatch(resetExperiment());

        expect(getMemorizedProcess()).toBeNull();

        expect(
            testStore.getState().laboratory.phase
        ).toBe("idle");

        expect(
            testStore.getState().laboratory.operationPhase
        ).toBe("idle");

        // 4. Simulate a later successful connection recovery
        mockedRecoverConnection.mockResolvedValue(true);

        const firstFile = new File(["first"], "first.png");
        const secondFile = new File(["second"], "second.png");

        const result = await testStore.dispatch(
            manualRetry(firstFile, secondFile)
        );

        // 5. No previous process should be resumed
        expect(result).toBe("none");

        expect(handler).not.toHaveBeenCalled();

        expect(getMemorizedProcess()).toBeNull();

        expect(
            testStore.getState().laboratory.operationPhase
        ).toBe("idle");

    });

});

