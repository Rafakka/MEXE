
import type { ImageMetadata } from "./imageType";
import type { LaboratoryPhase } from "../../src/features/laboratory/laboratoryPhase";
import type { OperationPhase } from "../../src/features/laboratory/operationPhase";
import type { LaboratoryOperation } from "../../src/features/laboratory/laboratoryOperation";


export const SESSION_VERSION = "1.0" as const;

export type SessionFile = {
    id: string;
    operation: LaboratoryOperation;
    dimensions: {
        width: number;
        height: number;
    };
    version: typeof SESSION_VERSION;
    metadata: {
        image_1: ImageMetadata;
        image_2: ImageMetadata;
        laboratoryPhase: LaboratoryPhase;
        operationPhase: OperationPhase;
    };
};

