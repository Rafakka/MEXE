

import { describe, expect, it, beforeEach } from "vitest";

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
        };

        memorizeProcess(process);

        const storedProcess = getMemorizedProcess();

        expect(storedProcess).toEqual(process);
    });

    it("forgets the interrupted process", () => {

    const process = {
        type: "blend",
        phase: "processing",
        operationPhase: "running",
    };

    memorizeProcess(process);

    expect(getMemorizedProcess()).toEqual(process);

    forgetProcess();

    expect(getMemorizedProcess()).toBeNull();

    });

});


