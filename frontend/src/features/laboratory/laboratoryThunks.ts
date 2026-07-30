

import type {AppDispatch, RootState} from "../../store/store";

import {selectSamplesReady} from "../../components/Laboratory/laboratorySelectors";

import {

    activatedExperiment,

    startupCompleted,

    mergeStarted,

    mergeCompleted,

    mergeFailed,

    stabilizationStarted,

    resultDisplayed,

    resetStarted,

    clearLaboratory,

} from "./laboratorySlice";

import {

    STARTUP_DURATION,

    SYNCHRONIZING_DURATION,

    STABILIZATION_DURATION,

    RESET_DURATION

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

        const result = await mexeApi.blend(

            firstFile,

            secondFile

        );

        console.log(result);

        dispatch(mergeCompleted(result));

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


    export const stabilizeExperiment =
    () => async (

    dispatch: AppDispatch,

    getState: () => RootState

    ) => {

    await delay(STABILIZATION_DURATION);

    dispatch(stabilizationStarted());

    await delay(STABILIZATION_DURATION);

    const {

        operationPhase

    } = getState().laboratory;

    if (operationPhase === "completed") {

        dispatch(resultDisplayed());

    }

    else {

        dispatch(

            resetStarted()

            );

        await dispatch(

           resetExperiment()
        );

        }

    };


    export const resetExperiment =
    () => async (

    dispatch: AppDispatch

    ) => {

    await delay(RESET_DURATION);

    dispatch(clearLaboratory());

    };




