
import type { LaboratoryOperation } from "../features/laboratory/laboratoryOperation";

export type ProcessResult =
    | "success"
    | "failed";

export type ProcessHandler = (
    firstFile: File,
    secondFile: File,
) => Promise<ProcessResult>;

const processRegistry = new Map<
    LaboratoryOperation,
    ProcessHandler
    >();

export function registerProcess(
    type:LaboratoryOperation,
    handler: ProcessHandler
): void {
    processRegistry.set(type, handler);
}

export function getProcessHandler(
    type: LaboratoryOperation
): ProcessHandler | null {
    return processRegistry.get(type) ?? null;
}

export function unregisterProcess(type: LaboratoryOperation): void {
    processRegistry.delete(type);
}
