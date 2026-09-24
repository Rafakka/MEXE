import type { SessionFile } from "../types/session";
import type { RecoveryProcess } from "./resilienceMemory";

export function adaptSessionToRecovery(
    session: SessionFile
): RecoveryProcess {

    return {
        type: session.operation,
        phase: session.metadata.laboratoryPhase,
        operationPhase: session.metadata.operationPhase,
    };
}
