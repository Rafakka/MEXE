

import type {AppDispatch, RootState} from "../../store/store";

import {selectSamplesReady} from "../../components/Laboratory/laboratorySelectors";

import {

    activatedExperiment,

    startupCompleted,

    mergeStarted,

    mergeCompleted,

    mergeFailed,

    revealingStarted,

    processingRunning,

    clearLaboratory,

    acceleratingStarted,

} from "./laboratorySlice";

import {

    STARTUP_DURATION,

    RESET_DURATION,


    } from "../../features/laboratory/utils/timers";

import {delay} from "../../features/laboratory/utils/delay";

import { mexeApi } from "../../api/mexeApi";

    export const waitForSamples =
    () => async (

    dispatch: AppDispatch,

    getState: ()=> RootState

    ) => {

        console.log("WAIT FOR SAMPLES");

    const {

        sampleArrivals

    } = getState().laboratory;

        if (sampleArrivals < 2) {

        console.log("WAITING...");

        return;
        }

        console.log("BOTH ARRIVED");

        dispatch(revealingStarted());

        console.log("REVEALING STARTED", performance.now());


    };

    export const activeLab = () =>

        async (
            dispatch: AppDispatch
        ) => {

            dispatch(activatedExperiment());

        };

    export const tryStartExperiment =
        () => async (
            dispatch: AppDispatch,
            getState: () => RootState
        ) => {

        if (!selectSamplesReady(getState())) {
        return;
        }

        return dispatch(runExperiment());

        };

    export const runExperiment = () =>

        async (
            dispatch: AppDispatch,
            getState: () => RootState
        ) => {

            const ready = selectSamplesReady(getState());

            if (!ready) {
                return;
            }

            await delay(STARTUP_DURATION);

            dispatch(startupCompleted());

            return;
        };


    export const startProcessing = () => async (

        dispatch: AppDispatch
    ) => {

        dispatch(processingRunning());

        dispatch(mergeStarted());

        const success = await dispatch(performMerge());

        if(!success) {

            dispatch(clearLaboratory());
        }
    };

    export const performMerge =
        () => async (

    dispatch: AppDispatch,

    getState: () => RootState

    ) => {

    try {

        const {

            firstFile,

            secondFile

        } = getState().laboratory.samples;

        if (!firstFile || !secondFile) {

            throw new Error("Samples not loaded");

        }

        console.log(">>> API START");

        const result = await mexeApi.blend(

            firstFile,

            secondFile

        );

        console.log(">>> API END");

        dispatch(mergeCompleted(result));

        console.log("OP BEFORE", getState().laboratory.operationPhase);

        dispatch(acceleratingStarted());

        console.log("OP AFTER", getState().laboratory.operationPhase);

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




