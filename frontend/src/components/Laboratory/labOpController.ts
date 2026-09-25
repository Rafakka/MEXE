import type { AppDispatch } from "../../store/store";

import type { LabContext } from "./labContext";

import {
    readyToProcess,
    startProcessing,
    manualRetry,
    manualReentry,
} from "../../features/laboratory/laboratoryThunks";

export async function startOperation(
    context: LabContext,
    dispatch: AppDispatch
) {

    const {
        operation,
        firstFile,
        secondFile,
    } = context;

    if (!firstFile || !secondFile) {
        throw new Error(
            "Cannot start operation without both files"
        );
    }

    await dispatch(
        readyToProcess(operation)
    );

    return dispatch(
        startProcessing(
            operation,
            firstFile,
            secondFile
        )
    );
}

export function retryOperation(
    context: LabContext,
    dispatch: AppDispatch
) {

    console.log("REENTRY CONTEXT:", context);
    const {
            operation,
            firstFile,
            secondFile,
        } = context;

        if (!firstFile || !secondFile) {
            throw new Error(
                "Cannot retry operation without both files"
            );
        }

    if(context.mode === "reentry") {
        return dispatch(
            manualReentry(
                operation,
                firstFile,
                secondFile
                )
            );
        }

        return dispatch(
            manualRetry(firstFile, secondFile)
        );

    }

