

export type ProcessHandler = () => Promise<void>;

const processRegistry = new Map<string, ProcessHandler>();

export function registerProcess(
    type: string,
    handler: ProcessHandler
): void {
    processRegistry.set(type, handler);
}

export function getProcessHandler(
    type: string
): ProcessHandler | null {
    return processRegistry.get(type) ?? null;
}

export function unregisterProcess(type: string): void {
    processRegistry.delete(type);
}
