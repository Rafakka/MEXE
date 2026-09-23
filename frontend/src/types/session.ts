
import type { ImageMetadata } from "./imageType";
import type { LaboratoryPhase } from "../../src/features/laboratory/laboratoryPhase";
import type { OperationPhase } from "../../src/features/laboratory/operationPhase";

export type SessionFile = {
    id: string;
    operation: string;
    dimensions: {
        width: number;
        height: number;
    };
    version: string;
    metadata: {
        image_1: ImageMetadata;
        image_2: ImageMetadata;
        laboratoryPhase: LaboratoryPhase;
        operationPhase: OperationPhase;
    };
};

