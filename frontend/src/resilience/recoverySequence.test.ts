


import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";

import { configureStore } from "@reduxjs/toolkit";

import laboratoryReducer from "../features/laboratory/laboratorySlice";

import {
    manualRetry,
} from "../features/laboratory/laboratoryThunks";

import {
    recoverConnection,
} from "./connectionRecovery";

import {
    memorizeProcess,
    getMemorizedProcess,
    forgetProcess,
} from "./resilienceMemory";

import {
    registerProcess,
    unregisterProcess,
} from "./processRegistry";

import type {
    ProcessResult,
} from "./processRegistry";

vi.mock("./connectionRecovery", () => ({
    recoverConnection: vi.fn(),
}));

describe("recovery sequence integration", () => {

    const firstFile = new File(
        ["first image"],
        "first.png",
        { type: "image/png" }
    );

    const secondFile = new File(
        ["second image"],
        "second.png",
        { type: "image/png" }
    );

    const interruptedProcess = {
        type: "blend" as const,
        phase: "processing" as const,
        operationPhase: "running" as const,
    };

    const createStore = () => configureStore({
        reducer: {
            laboratory: laboratoryReducer,
        },
    });

    afterEach(() => {
        forgetProcess();
        unregisterProcess("blend");
        vi.restoreAllMocks();
    });

    it("preserves the interrupted process after a failed recovery handler and resumes it on the next retry", async () => {

        const testStore = createStore();

        // 1. Memorize the interrupted process.

        memorizeProcess(interruptedProcess);

        expect(getMemorizedProcess())
            .toEqual(interruptedProcess);

        // 2. Register a handler that fails once and succeeds next time.

        const handler = vi.fn(
            async (): Promise<ProcessResult> => "failed"
        );

        handler
            .mockResolvedValueOnce("failed")
            .mockResolvedValueOnce("success");

        registerProcess("blend", handler);

        // 3. The backend is reachable on both attempts.

        vi.mocked(recoverConnection)
            .mockResolvedValue(true);

        // 4. First retry: connection recovers, handler fails.

        const firstResult = await testStore.dispatch(
            manualRetry(firstFile, secondFile)
        );

        expect(firstResult).toBe("failed");

        expect(recoverConnection)
            .toHaveBeenCalledOnce();

        expect(handler)
            .toHaveBeenCalledOnce();

        expect(getMemorizedProcess())
            .toEqual(interruptedProcess);

        expect(
            testStore.getState().laboratory.operationPhase
        ).toBe("offline");

        // 5. Second retry: the same process is attempted again.

        const secondResult = await testStore.dispatch(
            manualRetry(firstFile, secondFile)
        );

        expect(secondResult).toBe("success");

        expect(recoverConnection)
            .toHaveBeenCalledTimes(2);

        expect(handler)
            .toHaveBeenCalledTimes(2);

        // 6. Successful recovery clears the interrupted process.

        expect(getMemorizedProcess()).toBeNull();

    });

});

