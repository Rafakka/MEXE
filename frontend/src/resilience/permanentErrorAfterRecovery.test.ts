
import { afterEach, describe, expect, it, vi } from "vitest";
import { configureStore } from "@reduxjs/toolkit";

import laboratoryReducer from "../features/laboratory/laboratorySlice";

import { performMerge } from "../features/laboratory/laboratoryThunks";

import { mexeApi } from "../api/mexeApi";
import { recoverConnection } from "./connectionRecovery";

import {
    memorizeProcess,
    getMemorizedProcess,
    forgetProcess,
} from "./resilienceMemory";

vi.mock("./connectionRecovery", () => ({
    recoverConnection: vi.fn(),
}));

afterEach(() => {
    forgetProcess();
    vi.restoreAllMocks();
});

describe("permanent error after connection recovery", () => {

    it("clears the interrupted process when the second execution fails permanently", async () => {

        // 1. Create laboratory store
        const testStore = configureStore({
            reducer: {
                laboratory: laboratoryReducer,
            },
        });

        // 2. Memorize interrupted process
        const interruptedProcess = {
            type: "blend" as const,
            phase: "processing" as const,
            operationPhase: "running" as const,
        };

        memorizeProcess(interruptedProcess);

        // 3. Backend becomes available
        vi.spyOn(mexeApi, "ready")
            .mockResolvedValue(undefined);

        // 4. First execution fails due to connection,
        // second execution fails due to permanent HTTP error
        const blendSpy = vi.spyOn(mexeApi, "blend")
            .mockRejectedValueOnce(
                new Error("HTTP 503")
            )
            .mockRejectedValueOnce(
                new Error("HTTP 400")
            );

        vi.mocked(recoverConnection)
            .mockResolvedValue(true);

        // 5. Execute merge
        const result = await testStore.dispatch(
            performMerge(
                new File(["first"], "first.png"),
                new File(["second"], "second.png")
            )
        );

        const state = testStore.getState().laboratory;

        // 6. Verify both executions occurred
        expect(blendSpy).toHaveBeenCalledTimes(2);

        expect(recoverConnection).toHaveBeenCalledOnce();

        // 7. Permanent failure must terminate the operation
        expect(result).toBe("failed");

        expect(state.operationPhase).toBe("failed");

        expect(state.notification?.type).toBe("error");

        // 8. The interrupted process must no longer exist
        expect(getMemorizedProcess()).toBeNull();

    });

});

