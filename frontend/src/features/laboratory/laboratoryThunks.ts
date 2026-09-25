

import type {AppDispatch} from "../../store/store";

import type {LaboratoryOperation} from "../../features/laboratory/laboratoryOperation";

import { recoverConnection} from "../../resilience/connectionRecovery";

import {

    activatedExperiment,

    mergeStarted,

    mergeCompleted,

    processingRunning,

    clearLaboratory,

    acceleratingStarted,

    reconnectingStarted,

    backendOffline,

    backendRecovered,

    restoreRecoveredState,

    revealingStarted,

} from "./laboratorySlice";

import {
    memorizeProcess,
    getMemorizedProcess,
    forgetProcess,
} from "../../resilience/resilienceMemory";

import {readSessionFile} from "../../resilience/reentryReader";

import { reconstructFiles} from "../../resilience/reconstructor";

import { SessionValidator } from "../../services/sessionValidator";

import { adaptSessionToRecovery } from "../../resilience/reentryAdapter";

import { getProcessHandler } from "../../resilience/processRegistry";

import { mexeApi } from "../../api/mexeApi";



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

    export const readyToProcess = (
        operation: string
        ) => async () => {

        const handler = getProcessHandler(operation);

        if (!handler) {
            throw new Error(
                `Unsupported operation: ${operation}`
            );
        }

        return {
            ready: true,
            operation,
            };
        };

    async function executeMerge(
        firstFile: File,
        secondFile: File
    ) {
        console.log(">>> API START");

        await mexeApi.ready();

        console.log(">>> API READY SUCCESS");

        console.log(">>> BLEND START");

        const result = await mexeApi.blend(
            firstFile,
            secondFile
        );

        console.log(">>> BLEND SUCCESS");

        console.log(">>> API END");

        return result;
    };

    export const startProcessing = (
        operation: string,
        firstFile: File,
        secondFile: File
    ) => async (
        dispatch: AppDispatch
    ) => {

        const handler = getProcessHandler(operation);

        console.log(
        ">>> START PROCESSING:",
        operation,
        handler,
        getMemorizedProcess()
        );

        if (!handler) {
            throw new Error(
                `Unsupported operation: ${operation}`
            );
        }

        memorizeProcess({
        type: operation,
        phase: "processing",
        operationPhase: "running",
        });

        console.log(
        ">>> AFTER memorizeProcess:",
        getMemorizedProcess()
        );

        dispatch(processingRunning());

        dispatch(mergeStarted());

        await handler(
            firstFile, secondFile
            )

    };

    export const performMerge = (
        firstFile: File,
        secondFile: File
    ) => async (
        dispatch: AppDispatch
    ) => {

        console.log(">>> PERFORM MERGE:", getMemorizedProcess());

    try {

        const result = await executeMerge(
            firstFile,
            secondFile
        );

        dispatch(mergeCompleted(result));

        dispatch(acceleratingStarted());

        forgetProcess();

        return "success";

    }

    catch (error) {

        console.error(error);

        console.log("MERGE FAILED:", getMemorizedProcess());

        if (!isConnectionError(error)) {
            throw error;
        }

        dispatch(reconnectingStarted());

        console.log(">>> STARTING CONNECTION RECOVERY");

        const recovered = await recoverConnection();

        console.log(">>> RECOVERY RESULT:", recovered);

            if (!recovered) {

                dispatch(backendOffline());

                return "failed";

            }

            console.log(">>> Backend Recovered");

            dispatch(backendRecovered());
            dispatch(restoreRecoveredState());

            const result = await executeMerge(
                firstFile,
                secondFile,
            );

            dispatch(mergeCompleted(result));
            dispatch(acceleratingStarted());

            forgetProcess();

            return "success";

        }
    };

    export const resumeProcess = (
        firstFile: File,
        secondFile: File
        ) => async () => {

        const process = getMemorizedProcess();

        if (!process) {
            console.log(">>> No interrupted process to resume");
            return "none";
            }

        console.log(
        ">>> MEMORIZED PROCESS BEFORE RESUME:",
        process
        );

        const handler = getProcessHandler(process.type);

        console.log(
        ">>> RESUME HANDLER:",
        handler
        );

        if (!handler) {
            console.error(
                `>>> No recovery handler registered for process: ${process.type}`
            );

            return "failed";
        }

        try {

            await handler(
                firstFile,
                secondFile
            );

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

   export const manualRetry = (
       firstFile: File,
       secondFile: File,
   ) => async (
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

    const resumed = await dispatch(resumeProcess(firstFile, secondFile));

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

    return "success";

    };


    export const validateAndProcessReentry =
        (file:Blob) => async (

    ) => {

        const {
            session,
            image1,
            image2,
        } = await readSessionFile(file);

        const validator = new SessionValidator();

        validator.validateSession(session);

        const recoveryProcess = adaptSessionToRecovery(session);

        memorizeProcess(recoveryProcess);

        const { firstFile, secondFile } = reconstructFiles({session, image1, image2});

        return {
            session,
            recoveryProcess,
            firstFile,
            secondFile,
        };

    };

    export const manualReentry = (
        operation:LaboratoryOperation,
        firstFile: File,
        secondFile: File,
   ) => async (
       dispatch: AppDispatch
    ) => {

    console.log(">>> 1. MANUAL REENTRY START");

    if(operation === "blend") {

            const result = await dispatch(performMerge(firstFile, secondFile)
        );

        if(!result){
            return "failed";
        }

        dispatch(revealingStarted());

        return "success";

    }

    return "failed";

    };


    export const resetExperiment =
    () => async (

    dispatch: AppDispatch

    ) => {

    dispatch(clearLaboratory());

    };
