

import type {AppDispatch, RootState} from "../../store/store";

import {selectSamplesReady} from "../../components/Laboratory/laboratorySelectors";

import {

    activatedExperiment,

    startupCompleted,

    mergeStarted,

    mergeCompleted,

    mergeFailed,

    processingRunning,

    stabilizationStarted,

    resultDisplayed,

    resetStarted,

    clearLaboratory,

} from "./laboratorySlice";

import {

    STARTUP_DURATION,

    AXIS_REVEAL_DURATION,

    AXIS_ROTATION_TIME,

    SYNCHRONIZING_DURATION,

    PROCESSING_DURATION,

    STABILIZATION_DURATION,

    RESULT_DURATION,

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

            await delay(SYNCHRONIZING_DURATION);

            dispatch(mergeStarted());

            await delay(AXIS_REVEAL_DURATION);

            dispatch(processingRunning());

            await delay(AXIS_ROTATION_TIME);

            const success = await dispatch(performMerge());

            if (!success) {
                dispatch(clearLaboratory());

                return;
            }

            return success;
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

        await delay(PROCESSING_DURATION);

        console.log(">>DISPATCHING STABILIZATING")

        dispatch(stabilizationStarted());

        await delay(STABILIZATION_DURATION);

        dispatch(resultDisplayed());

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




