

import type {AppDispatch} from "../../store/store";

import {

    activatedExperiment,

    mergeStarted,

    mergeCompleted,

    mergeFailed,

    processingRunning,

    clearLaboratory,

    acceleratingStarted,

} from "./laboratorySlice";

import {

    RESET_DURATION,


    } from "../../features/laboratory/utils/timers";

import {delay} from "../../features/laboratory/utils/delay";

import { mexeApi } from "../../api/mexeApi";

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

        const success = await dispatch(performMerge(firstFile, secondFile));

        if(!success) {

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

        return true;

    }

    catch (error) {

        console.error(error);

        dispatch(

            mergeFailed({

                type: "error",

                title: "Merge Error",

                message: "Unable to merge images."

                })

            );

            return false;

        }
    };


    export const resetExperiment =
    () => async (

    dispatch: AppDispatch

    ) => {

    await delay(RESET_DURATION);

    dispatch(clearLaboratory());

    };




