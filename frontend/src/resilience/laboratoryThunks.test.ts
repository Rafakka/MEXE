import { afterEach, describe, expect, it, vi } from "vitest";
import { configureStore } from "@reduxjs/toolkit";

import laboratoryReducer from "../features/laboratory/laboratorySlice";
import {
    performMerge,
    manualRetry
} from "../features/laboratory/laboratoryThunks";

import { mexeApi } from "../api/mexeApi";
import { recoverConnection } from "../resilience/connectionRecovery";
import {
    memorizeProcess,
    forgetProcess
} from "./resilienceMemory";
import {
    registerProcess,
    unregisterProcess
} from "../resilience/processRegistry";

vi.mock("../resilience/connectionRecovery", () => ({
    recoverConnection: vi.fn(),
}));

describe("laboratory resilience", () => {

    afterEach(() => {
        forgetProcess();
        unregisterProcess("blend");
        vi.restoreAllMocks();
    });

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

    it("resumes the interrupted process after a successful manual retry", async () => {

        const testStore = configureStore({
            reducer: {
                laboratory: laboratoryReducer,
            },
        });

        const resumeHandler = vi.fn().mockResolvedValue(undefined);

        memorizeProcess({
            type: "blend",
            phase: "processing",
            operationPhase: "running",
        });

        registerProcess("blend", resumeHandler);

        vi.mocked(recoverConnection)
            .mockResolvedValue(true);

        await testStore.dispatch(
            manualRetry()
        );

        expect(recoverConnection).toHaveBeenCalledOnce();

        expect(resumeHandler).toHaveBeenCalledOnce();

        unregisterProcess("blend");
    });

    it("enters offline when manual retry fails to recover the backend", async () => {

        const testStore = configureStore({
            reducer: {
                laboratory: laboratoryReducer,
            },
        });

        vi.mocked(recoverConnection)
            .mockResolvedValue(false);

        await testStore.dispatch(
            manualRetry()
        );

        const state = testStore.getState().laboratory;

        expect(recoverConnection).toHaveBeenCalledOnce();

        expect(state.operationPhase).toBe("offline");

        expect(state.notification?.type).toBe("error");
    });

    it("recovers the backend without resuming when there is no interrupted process", async () => {

        const testStore = configureStore({
            reducer: {
                laboratory: laboratoryReducer,
            },
        });

        vi.mocked(recoverConnection)
            .mockResolvedValue(true);

        await testStore.dispatch(
            manualRetry()
        );

        const state = testStore.getState().laboratory;

        expect(recoverConnection).toHaveBeenCalledOnce();

        expect(state.operationPhase).toBe("idle");

        expect(state.notification?.type).toBe("success");

        expect(state.notification?.title).toBe("Backend Online");
    });

    it("enters offline when the interrupted process has no registered handler", async () => {

        const testStore = configureStore({
            reducer: {
                laboratory: laboratoryReducer,
            },
        });

        memorizeProcess({
            type: "blend",
            phase: "processing",
            operationPhase: "running",
        });

        vi.mocked(recoverConnection)
            .mockResolvedValue(true);

        await testStore.dispatch(
            manualRetry()
        );

        const state = testStore.getState().laboratory;

        expect(recoverConnection).toHaveBeenCalledOnce();

        expect(state.operationPhase).toBe("offline");

        expect(state.notification?.type).toBe("error");
    });

    it("resumes the memorized process through the real recovery registry", async () => {

        const testStore = configureStore({
            reducer: {
                laboratory: laboratoryReducer,
            },
        });

        const resumeHandler = vi.fn().mockResolvedValue(undefined);

        memorizeProcess({
            type: "blend",
            phase: "processing",
            operationPhase: "running",
        });

        registerProcess("blend", resumeHandler);

        vi.mocked(recoverConnection)
            .mockResolvedValue(true);

        await testStore.dispatch(
            manualRetry()
        );

        const state = testStore.getState().laboratory;

        expect(recoverConnection).toHaveBeenCalledOnce();

        expect(resumeHandler).toHaveBeenCalledOnce();

        expect(state.operationPhase).toBe("idle");
    });

    it("handles a failure while resuming the interrupted process", async () => {

        const testStore = configureStore({
            reducer: {
                laboratory: laboratoryReducer,
            },
        });

        const resumeHandler = vi
            .fn()
            .mockRejectedValue(new Error("Resume failed"));

        memorizeProcess({
            type: "blend",
            phase: "processing",
            operationPhase: "running",
        });

        registerProcess("blend", resumeHandler);

        vi.mocked(recoverConnection)
            .mockResolvedValue(true);

        await testStore.dispatch(
            manualRetry()
        );

        const state = testStore.getState().laboratory;

        expect(recoverConnection).toHaveBeenCalledOnce();

        expect(resumeHandler).toHaveBeenCalledOnce();

        expect(state.operationPhase).toBe("offline");

        expect(state.notification?.type).toBe("error");
    });

    it("does not resume the same interrupted process twice", async () => {

        const testStore = configureStore({
            reducer: {
                laboratory: laboratoryReducer,
            },
        });

        const resumeHandler = vi
            .fn()
            .mockResolvedValue(undefined);

        memorizeProcess({
            type: "blend",
            phase: "processing",
            operationPhase: "running",
        });

        registerProcess("blend", resumeHandler);

        vi.mocked(recoverConnection)
            .mockResolvedValue(true);

        await testStore.dispatch(
            manualRetry()
        );

        await testStore.dispatch(
            manualRetry()
        );

        expect(recoverConnection).toHaveBeenCalledTimes(2);

        expect(resumeHandler).toHaveBeenCalledOnce();
    });

});
