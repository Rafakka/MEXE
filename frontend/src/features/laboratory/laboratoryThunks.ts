

import type {AppDispatch} from "../../store/store";

import { recoverConnection} from "../../resilience/connectionRecovery";

import {

    activatedExperiment,

    mergeStarted,

    mergeCompleted,

    mergeFailed,

    processingRunning,

    clearLaboratory,

    acceleratingStarted,

    reconnectingStarted,

    backendOffline,

    backendRecovered,

    restoreRecoveredState,

} from "./laboratorySlice";

import { memorizeProcess, getMemorizedProcess, forgetProcess } from "../../resilience/resilienceMemory";

import { getProcessHandler } from "../../resilience/processRegistry";

import { mexeApi } from "../../api/mexeApi";

// type MergeResult = "success" | "failed";

    function isConnectionError(error: unknown): boolean {
        return (
            error instanceof Error && /HTTP (502|503|504)/.test(error.message)
        );
    };

    export const activeLab = () =>

        async (
            dispatch: AppDispatch
        ) => {

            dispatch(activatedExperiment());
        };

    export const startProcessing = (
        firstFile: File,
        secondFile: File
    ) => async (
        dispatch: AppDispatch
    ) => {

        memorizeProcess({
        type: "blend",
        phase: "processing",
        operationPhase: "running",
        });

        dispatch(processingRunning());

        dispatch(mergeStarted());

        await dispatch(performMerge(firstFile, secondFile));

    };

    export const performMerge = (
        firstFile: File,
        secondFile: File
    ) => async (
        dispatch: AppDispatch
    ) => {

    try {

        console.log(">>> API START");

        await mexeApi.ready();

        const result = await mexeApi.blend(
            firstFile,
            secondFile
        );

        console.log(">>> API END");

        dispatch(mergeCompleted(result));

        dispatch(acceleratingStarted());

        forgetProcess();

        return "success";

    }

    catch (error) {

        console.error(error);

        if (isConnectionError(error)) {

            dispatch(reconnectingStarted());

            console.log(">>> STARTING CONNECTION RECOVERY");

            const recovered = await recoverConnection();

            console.log(">>> RECOVERY RESULT:", recovered);

            if (recovered) {

                console.log(">>> Backend recovered");

                dispatch(backendRecovered());

                dispatch(restoreRecoveredState());

                return "success";

            }

            dispatch(backendOffline());

            return;
        }

        dispatch(
            mergeFailed({
                type: "error",
                title: "Merge Error",
                message: "Unable to merge images."
                })
            );
            return "failed";
        }
    };

   export const manualRetry = () => async (
       dispatch: AppDispatch
    ) => {

    console.log(">>> 1. MANUAL RETRY START");

    dispatch(reconnectingStarted());

    const recovered = await recoverConnection();

    console.log(
        ">>> 2. CONNECTION RESULT:",
        recovered
    );

    if (!recovered) {

        console.log(">>> 3. CONNECTION FAILED");
        dispatch(backendOffline());
        return "failed";
    }

    console.log(">>> 3. CONNECTION RECOVERED");

    dispatch(backendRecovered());

    const resumed = await dispatch(resumeProcess());

    console.log(
        ">>> 4. RESUME RESULT:",
        resumed
    );

     if (resumed === "none") {
        console.log(">>> 5. NO PROCESS");

        dispatch(restoreRecoveredState());
        return;
    }

    if (resumed === "failed") {
        dispatch(backendOffline());
        return "failed";
    }

    console.log(">>> 5. RESUME SUCCESS");

    dispatch(restoreRecoveredState());

    console.log(">>> RESUME RESULT:", resumed);

    return resumed;

    };

    export const resumeProcess = () => async () => {

    const process = getMemorizedProcess();

    if (!process) {
        console.log(">>> No interrupted process to resume");
        return "none";
    }

    console.log(
        ">>> Resuming process:",
        process.type
    );

    const handler = getProcessHandler(process.type);

    if (!handler) {
        console.error(
            `>>> No recovery handler registered for process: ${process.type}`
        );

        return "failed";
    }

    try {

        await handler();

        forgetProcess();

        return "success";

    } catch (error) {

        console.error(
            ">>> Failed to resume interrupted process:",
            error
        );

        return "failed";
        }
    };

    export const resetExperiment =
    () => async (

    dispatch: AppDispatch

    ) => {

    dispatch(clearLaboratory());

    };
