

import type { LaboratoryOperation } from "../../features/laboratory/laboratoryOperation";
import type { LaboratoryMode } from "../../features/laboratory/LaboratoryMode";

export type LabContext = {
    operation: LaboratoryOperation;
    mode: LaboratoryMode;

    firstFile: File | null;
    secondFile: File | null;
};

export function createLabContext(
    operation: LaboratoryOperation,
    mode: LaboratoryMode,
    firstFile: File | null,
    secondFile: File | null,
): LabContext {

    return {
        operation,
        mode,
        firstFile,
        secondFile,
    };
}



