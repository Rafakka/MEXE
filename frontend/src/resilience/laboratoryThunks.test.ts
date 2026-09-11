import { describe, expect, it, vi } from "vitest";
import { configureStore } from "@reduxjs/toolkit";

import laboratoryReducer from "../features/laboratory/laboratorySlice";
import { performMerge } from "../features/laboratory/laboratoryThunks";

import { mexeApi } from "../api/mexeApi";
import { recoverConnection } from "../resilience/connectionRecovery";

vi.mock("../resilience/connectionRecovery", () => ({
    recoverConnection: vi.fn(),
}));

describe("laboratory resilience", () => {

    it("enters offline when the backend returns 503 and recovery fails", async () => {

        const testStore = configureStore({
            reducer: {
                laboratory: laboratoryReducer,
            },
        });

        vi.spyOn(mexeApi, "ready")
            .mockResolvedValue(undefined);

        vi.spyOn(mexeApi, "blend")
            .mockRejectedValue(new Error("HTTP 503"));

        vi.mocked(recoverConnection)
            .mockResolvedValue(false);

        const firstFile = new File(["image"], "first.png");
        const secondFile = new File(["image"], "second.png");

        await testStore.dispatch(
            performMerge(firstFile, secondFile)
        );

        const state = testStore.getState().laboratory;

        expect(recoverConnection).toHaveBeenCalledOnce();
        expect(state.operationPhase).toBe("offline");
        expect(state.notification?.type).toBe("error");
    });

    it("restores the previous state when the backend recovers", async () => {

    const testStore = configureStore({
        reducer: {
            laboratory: laboratoryReducer,
        },
    });

    testStore.dispatch({
        type: "laboratory/mergeStarted",
    });

    testStore.dispatch({
        type: "laboratory/processingRunning",
    });

    vi.spyOn(mexeApi, "ready")
        .mockResolvedValue(undefined);

    vi.spyOn(mexeApi, "blend")
        .mockRejectedValue(new Error("HTTP 503"));

    vi.mocked(recoverConnection)
        .mockResolvedValue(true);

    const firstFile = new File(["image"], "first.png");
    const secondFile = new File(["image"], "second.png");

    await testStore.dispatch(
        performMerge(firstFile, secondFile)
    );

    const state = testStore.getState().laboratory;

    expect(recoverConnection).toHaveBeenCalledOnce();

    expect(state.phase).toBe("processing");
    expect(state.operationPhase).toBe("running");

    });
});
