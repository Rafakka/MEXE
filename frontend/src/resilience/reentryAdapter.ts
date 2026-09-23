import type { SessionFile } from "../../src/services/saveSession";
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
