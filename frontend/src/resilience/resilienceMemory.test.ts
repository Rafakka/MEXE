

import { describe, expect, it, beforeEach } from "vitest";

import type { RecoveryProcess } from "./resilienceMemory";

import {
    memorizeProcess,
    getMemorizedProcess,
    forgetProcess,
} from "./resilienceMemory";

describe("resilience memory", () => {

    beforeEach(() => {
        forgetProcess();
    });

    it("stores and retrieves the interrupted process", () => {

        const process = {
            type: "blend",
            phase: "processing",
            operationPhase: "running",
        } satisfies RecoveryProcess;

        memorizeProcess(process);

        const storedProcess = getMemorizedProcess();

        expect(storedProcess).toEqual(process);
    });

    it("forgets the interrupted process", () => {

    const process = {
        type: "blend",
        phase: "processing",
        operationPhase: "running",
    } satisfies RecoveryProcess;

    memorizeProcess(process);

    expect(getMemorizedProcess()).toEqual(process);

    forgetProcess();

    expect(getMemorizedProcess()).toBeNull();

    });

});


