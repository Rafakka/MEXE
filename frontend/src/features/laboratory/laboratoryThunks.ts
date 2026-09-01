

import type {AppDispatch} from "../../store/store";

import {

    activatedExperiment,

    mergeStarted,

    mergeCompleted,

    mergeFailed,

    processingRunning,

    clearLaboratory,

    acceleratingStarted,

    reconnectingStarted,

} from "./laboratorySlice";

import { mexeApi } from "../../api/mexeApi";

// type MergeResult = "success" | "failed" | "reconnecting";

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

        const result = await dispatch(performMerge(firstFile, secondFile));

        if(result === "failed") {
            dispatch(clearLaboratory());
        }
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

            return "reconnecting"
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

    export const resetExperiment =
    () => async (

    dispatch: AppDispatch

    ) => {

    dispatch(clearLaboratory());

    };
