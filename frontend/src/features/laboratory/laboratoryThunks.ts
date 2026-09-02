

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

} from "./laboratorySlice";

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

        const result = await mexeApi.blend(
            firstFile,
            secondFile
        );

        console.log(">>> API END");

        dispatch(mergeCompleted(result));

        dispatch(acceleratingStarted());

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

                return;

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

    dispatch(reconnectingStarted());

    console.log(">>> MANUAL RETRY");

    const recovered = await recoverConnection();

    console.log(">>> MANUAL RETRY RESULT:", recovered);

    if (recovered) {
        dispatch(backendRecovered());
        return;
    }

    dispatch(backendOffline());

    };


    export const resetExperiment =
    () => async (

    dispatch: AppDispatch

    ) => {

    dispatch(clearLaboratory());

    };
