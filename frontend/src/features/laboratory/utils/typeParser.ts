
import type { LaboratoryOperation } from "../../../features/laboratory/laboratoryOperation";

export function parseLaboratoryOperation(
    operation: string
): LaboratoryOperation {

    switch (operation) {
        case "blend":
            return "blend";

        // outras operações futuramente

        default:
            throw new Error(
                `Unsupported laboratory operation: ${operation}`
            );
    }
}
