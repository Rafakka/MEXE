

import type {AppDispatch} from "../../store/store";

import type {LaboratoryOperation} from "../../features/laboratory/laboratoryOperation";

import { recoverConnection} from "../../resilience/connectionRecovery";

import {

    activatedExperiment,

    mergeStarted,

    mergeFailed,

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

import { reconstructFiles} from "../../resilience/reconstructor";

import { SessionValidator } from "../../services/sessionValidator";

import { getProcessHandler, type ProcessResult } from "../../resilience/processRegistry";

import { mexeApi } from "../../api/mexeApi";

import { adaptSessionToRecovery } from "../../resilience/reentryAdapter";

import {parseLaboratoryOperation } from "../../features/laboratory/utils/typeParser";


    function isConnectionError(error: unknown): boolean {
        return (
            error instanceof TypeError ||
                (
                    error instanceof Error &&
                    /HTTP (502|503|504)/.test(error.message)
                )
            );
    };

    export const activeLab = () =>
        async (
            dispatch: AppDispatch
        ) => {
            dispatch(activatedExperiment());
        };

    export const readyToProcess = (
        operation: LaboratoryOperation
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

    function failOperation(
        dispatch: AppDispatch,
        error: unknown
    ): ProcessResult {

        dispatch(mergeFailed({
            type: "error",
            title: "Operation Failed",
            message: error instanceof Error
                ? error.message
                : "The operation could not be completed."
        }));

        forgetProcess();

        return "failed";
    }

    export const startProcessing = (
        operation: LaboratoryOperation,
        firstFile: File,
        secondFile: File
    ) => async (
        dispatch: AppDispatch
    ): Promise<ProcessResult> => {

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

        return handler(
            firstFile, secondFile
            )

    };

    function completeMerge(
        dispatch: AppDispatch,
        result: Awaited<ReturnType<typeof mexeApi.blend>>
    ): ProcessResult {
            dispatch(mergeCompleted(result));
            dispatch(acceleratingStarted());

            forgetProcess();

            return "success";
        }


    export const performMerge = (
        firstFile: File,
        secondFile: File
    ) => async (
        dispatch: AppDispatch
    ): Promise<ProcessResult> => {

        console.log(">>> PERFORM MERGE:", getMemorizedProcess());

    // First execution
        try {

            const result = await executeMerge(
                firstFile,
                secondFile
            );

            return completeMerge(dispatch, result);

        } catch (error) {

            console.error(error);

            console.log("MERGE FAILED:", getMemorizedProcess());

            // Permanent error
            if (!isConnectionError(error)) {
                return failOperation(dispatch, error);
            }

            // Connection recovery
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

            // Second execution
            try {

                const result = await executeMerge(
                    firstFile,
                    secondFile
                );

                return completeMerge(dispatch, result);

            } catch (retryError) {

                // Connection failed again
                if (isConnectionError(retryError)) {
                    dispatch(backendOffline());
                    return "failed";
                }

                // Permanent error on second execution
                return failOperation(dispatch, retryError);

            }
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

            const result = await handler(
                firstFile,
                secondFile
            );

            if (result !== "success") {
                return "failed";
            }

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

        console.log(">>> 1. MANUAL RETRY START:");

        dispatch(reconnectingStarted());

        const recovered = await recoverConnection();

        console.log(
            ">>> 2. CONNECTION RESULT:",
            recovered
        );

        if (!recovered) {
            dispatch(backendOffline());
            return "failed";
        }


        dispatch(backendRecovered());

        dispatch(restoreRecoveredState());

        const resumed = await dispatch(resumeProcess(firstFile, secondFile));

        console.log(
            ">>> 4. RESUME RESULT:",
            resumed
        );

        if (resumed === "none") {
            return "none";
        }

        if (resumed === "failed") {

            if(getMemorizedProcess()){
                dispatch(backendOffline());
            }
            return "failed";

        }

        console.log(">>> 5. RESUME SUCCESS");

        return "success";

    };


    export const validateAndProcessReentry =
        (file:Blob) => async (

    ) => {

        console.log(">>> VALIDATING REENTRY FILE");

        const validator = new SessionValidator();

        const {
            session,
            image1,
            image2,
        } = await validator.validateFile(file);

        const operation = parseLaboratoryOperation(session.operation);

        const handler = getProcessHandler(operation);

        if (!handler) {
            throw new Error(
                `No registered handler for operation: ${operation}`
            );
        }

        const recoveryProcess = adaptSessionToRecovery(session);

        const {
            firstFile,
            secondFile,
        } = reconstructFiles({
            session,
            image1,
            image2
        });

        memorizeProcess(recoveryProcess);

        return {
            session,
            recoveryProcess,
            operation,
            firstFile,
            secondFile,
        };

    };

    export const manualReentry = (
        operation: LaboratoryOperation,
        firstFile: File,
        secondFile: File
        ) => async (
            dispatch: AppDispatch
        ): Promise<ProcessResult> => {

            console.log(">>> 1. MANUAL REENTRY START");

            const process = getMemorizedProcess();

            if (!process) {
                console.error(
                    ">>> No memorized Process avaliable for reentry"
                );

                return "failed";
            }

            if(process.type !== operation ){
                console.error(
                    ">>> Reentry operation does not match memorized process:",
                    {
                        requested: operation,
                        memorized: process.type,
                    }
                );

                return "failed";
            }

            const result = await dispatch(
                resumeProcess(firstFile, secondFile)
            );


            if (result !== "success") {
                return "failed";
            }
                dispatch(revealingStarted());

                console.log(">>> REENTRY SUCCESS", {
                        operation
                        });

                return "success";
            };


    export const resetExperiment =
    () => async (

    dispatch: AppDispatch

    ) => {

    forgetProcess();

    dispatch(clearLaboratory());

    };
