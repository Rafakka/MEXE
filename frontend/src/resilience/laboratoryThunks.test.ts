import { afterEach, describe, expect, it, vi } from "vitest";
import { configureStore } from "@reduxjs/toolkit";

import laboratoryReducer from "../features/laboratory/laboratorySlice";
import {
    performMerge,
    manualRetry,
    resetExperiment,
} from "../features/laboratory/laboratoryThunks";

import { mexeApi } from "../api/mexeApi";
import { recoverConnection } from "../resilience/connectionRecovery";
import {
    getMemorizedProcess,
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

    const firstFile = new File(
        ["image"],
        "first.png"
    );

    const secondFile = new File(
        ["image"],
        "second.png"
    );

    it("enters offline when the backend returns 503 and recovery fails", async () => {

        const testStore = configureStore({
            reducer: {
                laboratory: laboratoryReducer,
            },
        });

        vi.spyOn(mexeApi, "ready")
            .mockResolvedValue("success");

        vi.spyOn(mexeApi, "blend")
            .mockRejectedValue(
                new Error("HTTP 503")
            );

        vi.mocked(recoverConnection)
            .mockResolvedValue(false);

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
        .mockRejectedValueOnce(
            new Error("HTTP 503")
        )
        .mockResolvedValueOnce({
            url: "result.png",
            metadata: {},
        });

    vi.mocked(recoverConnection)
        .mockResolvedValue(true);

    await testStore.dispatch(
        performMerge(
            firstFile,
            secondFile
        )
    );

    const state = testStore.getState().laboratory;

    expect(recoverConnection)
        .toHaveBeenCalledOnce();

    expect(mexeApi.blend)
        .toHaveBeenCalledTimes(2);

    expect(state.phase)
        .toBe("processing");

    expect(state.operationPhase)
        .toBe("accelerating");

    });

    it("resumes the interrupted process after a successful manual retry", async () => {

        const testStore = configureStore({
            reducer: {
                laboratory: laboratoryReducer,
            },
        });

        const resumeHandler = vi.fn().mockResolvedValue("success");

        memorizeProcess({
            type: "blend",
            phase: "processing",
            operationPhase: "running",
        });

        registerProcess("blend", resumeHandler);

        vi.mocked(recoverConnection)
            .mockResolvedValue(true);

        await testStore.dispatch(
            manualRetry(firstFile, secondFile)
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
            manualRetry(firstFile, secondFile)
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
            manualRetry(firstFile, secondFile)
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
            manualRetry(firstFile, secondFile)
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

        const resumeHandler = vi.fn().mockResolvedValue("success");

        memorizeProcess({
            type: "blend",
            phase: "processing",
            operationPhase: "running",
        });

        registerProcess("blend", resumeHandler);

        vi.mocked(recoverConnection)
            .mockResolvedValue(true);

        await testStore.dispatch(
            manualRetry(firstFile, secondFile)
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
            manualRetry(firstFile, secondFile)
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
            .mockResolvedValue("success");

        memorizeProcess({
            type: "blend",
            phase: "processing",
            operationPhase: "running",
        });

        registerProcess("blend", resumeHandler);

        vi.mocked(recoverConnection)
            .mockResolvedValue(true);

        await testStore.dispatch(
            manualRetry(firstFile, secondFile)
        );

        await testStore.dispatch(
            manualRetry(firstFile, secondFile)
        );

        expect(recoverConnection).toHaveBeenCalledTimes(2);

        expect(resumeHandler).toHaveBeenCalledOnce();
    });

    it("keeps the interrupted process when the recovery handler returns failed", async () => {

        const testStore = configureStore({
            reducer: {
                laboratory: laboratoryReducer,
            },
        });

        const interruptedProcess = {
            type: "blend" as const,
            phase: "processing" as const,
            operationPhase: "running" as const,
        };

        const resumeHandler = vi.fn()
            .mockResolvedValue("failed");

        memorizeProcess(interruptedProcess);

        registerProcess(
            "blend",
            resumeHandler
        );

        vi.mocked(recoverConnection)
            .mockResolvedValue(true);

        const result = await testStore.dispatch(
            manualRetry(firstFile, secondFile)
        );

        const state = testStore.getState().laboratory;

        expect(recoverConnection).toHaveBeenCalledOnce();

        expect(resumeHandler).toHaveBeenCalledOnce();

        expect(result).toBe("failed");

        expect(state.operationPhase).toBe("offline");

        expect(state.notification?.type).toBe("error");

        expect(getMemorizedProcess()).toEqual(interruptedProcess);

    });

    it("clears the interrupted process when the experiment resets", async () => {

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

    expect(getMemorizedProcess()).not.toBeNull();

    await testStore.dispatch(
        resetExperiment()
    );

    const state = testStore.getState().laboratory;

    expect(getMemorizedProcess()).toBeNull();

    expect(state.phase).toBe("idle");

    expect(state.operationPhase).toBe("idle");

    });

    it("recovers from a network TypeError", async () => {

    const testStore = configureStore({
        reducer: {
            laboratory: laboratoryReducer,
        },
    });

    const interruptedProcess = {
        type: "blend" as const,
        phase: "processing" as const,
        operationPhase: "running" as const,
    };

    memorizeProcess(interruptedProcess);

    vi.spyOn(mexeApi, "ready")
        .mockRejectedValue(
            new TypeError("Failed to fetch")
        );

    vi.mocked(recoverConnection)
        .mockResolvedValue(false);

    const result = await testStore.dispatch(
        performMerge(firstFile, secondFile)
    );

    const state = testStore.getState().laboratory;

    expect(result).toBe("failed");

    expect(recoverConnection).toHaveBeenCalledOnce();

    expect(state.operationPhase).toBe("offline");

    expect(getMemorizedProcess()).toEqual(interruptedProcess);

    });

    it("marks the operation as failed on a permanent HTTP error", async () => {

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

    vi.spyOn(mexeApi, "ready")
        .mockResolvedValue(undefined);

    vi.spyOn(mexeApi, "blend")
        .mockRejectedValue(
            new Error("HTTP 400")
        );

    const result = await testStore.dispatch(
        performMerge(firstFile, secondFile)
    );

    const state = testStore.getState().laboratory;

    expect(result).toBe("failed");

    expect(recoverConnection).not.toHaveBeenCalled();

    expect(state.operationPhase).toBe("failed");

    expect(state.notification?.type).toBe("error");

    expect(getMemorizedProcess()).toBeNull();

    });

    it("preserves the process when the second execution fails with a connection error", async () => {

    const testStore = configureStore({
        reducer: {
            laboratory: laboratoryReducer,
        },
    });

    const interruptedProcess = {
        type: "blend" as const,
        phase: "processing" as const,
        operationPhase: "running" as const,
    };

    testStore.dispatch({
        type: "laboratory/mergeStarted",
    });

    testStore.dispatch({
        type: "laboratory/processingRunning",
    });

    memorizeProcess(interruptedProcess);

    vi.spyOn(mexeApi, "ready")
        .mockResolvedValue(undefined);

    vi.spyOn(mexeApi, "blend")
        .mockRejectedValueOnce(
            new Error("HTTP 503")
        )
        .mockRejectedValueOnce(
            new Error("HTTP 503")
        );

    vi.mocked(recoverConnection)
        .mockResolvedValue(true);

    const result = await testStore.dispatch(
        performMerge(firstFile, secondFile)
    );

    const state = testStore.getState().laboratory;

    expect(result).toBe("failed");

    expect(recoverConnection).toHaveBeenCalledOnce();

    expect(mexeApi.blend).toHaveBeenCalledTimes(2);

    expect(state.operationPhase).toBe("offline");

    expect(getMemorizedProcess()).toEqual(interruptedProcess);

    });

    it("keeps the completed state after a successful manual retry", async () => {

    const testStore = configureStore({
        reducer: {
            laboratory: laboratoryReducer,
        },
    });

    const interruptedProcess = {
        type: "blend" as const,
        phase: "processing" as const,
        operationPhase: "running" as const,
    };

    testStore.dispatch({
        type: "laboratory/mergeStarted",
    });

    testStore.dispatch({
        type: "laboratory/processingRunning",
    });

    memorizeProcess(interruptedProcess);

    vi.spyOn(mexeApi, "ready")
        .mockResolvedValue(undefined);

    vi.spyOn(mexeApi, "blend")
        .mockRejectedValueOnce(
            new Error("HTTP 503")
        )
        .mockResolvedValueOnce({
            url: "result.png",
            metadata: {},
        });

    vi.mocked(recoverConnection)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true);

    // First execution fails and enters offline.

    const initialResult = await testStore.dispatch(
        performMerge(firstFile, secondFile)
    );

    expect(initialResult).toBe("failed");

    expect(testStore.getState().laboratory.operationPhase)
        .toBe("offline");

    // Register the real recovery handler.

    const resumeHandler = vi.fn(
        async (first: File, second: File) =>
            testStore.dispatch(
                performMerge(first, second)
            )
    );

    registerProcess("blend", resumeHandler);

    // Manual retry.

    const result = await testStore.dispatch(
        manualRetry(firstFile, secondFile)
    );

    const state = testStore.getState().laboratory;

    expect(result).toBe("success");

    expect(recoverConnection).toHaveBeenCalledTimes(2);

    expect(mexeApi.blend).toHaveBeenCalledTimes(2);

    expect(resumeHandler).toHaveBeenCalledOnce();

    expect(state.operationPhase).toBe("accelerating");

    expect(state.recoveryStateBeforeReconnect).toBeNull();

    expect(getMemorizedProcess()).toBeNull();

    });

});
