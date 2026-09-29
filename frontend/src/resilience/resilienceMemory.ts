
import type {LaboratoryPhase} from "../features/laboratory/laboratoryPhase";
import type {OperationPhase} from "../features/laboratory/operationPhase";
import type {LaboratoryOperation} from "../features/laboratory/laboratoryOperation";

export interface RecoveryProcess {
    type: LaboratoryOperation;
    phase: LaboratoryPhase;
    operationPhase: OperationPhase;
}

let interruptedProcess: RecoveryProcess | null = null;

export function memorizeProcess(process: RecoveryProcess): void {
    if (interruptedProcess === null) {
        interruptedProcess = process;
    }
}

export function getMemorizedProcess(): RecoveryProcess | null {
    return interruptedProcess;
}

export function forgetProcess(): void {
    interruptedProcess = null;
}
