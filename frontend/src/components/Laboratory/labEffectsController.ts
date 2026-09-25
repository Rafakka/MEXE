
import type { AppDispatch } from "../../store/store";

import {
    registerProcess,
    unregisterProcess,
} from "../../resilience/processRegistry";

import {
    performMerge,
} from "../../features/laboratory/laboratoryThunks";


export const registerLaboratoryEffects = (
    dispatch: AppDispatch
) => {

    registerProcess(
        "blend",
        async (firstFile, secondFile) => {

            await dispatch(
                performMerge(
                    firstFile,
                    secondFile
                )
            );

        }
    );

    return () => {

        unregisterProcess("blend");

    };
};
