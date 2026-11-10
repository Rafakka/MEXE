
import { afterEach, describe, expect, it } from "vitest";

import {
    getMemorizedProcess,
    memorizeProcess,
    forgetProcess,
} from "./resilienceMemory";

import { validateAndProcessReentry } from "../features/laboratory/laboratoryThunks";

afterEach(() => {
    forgetProcess();
});

describe("reentry isolation", () => {

    it("preserves the existing recovery process when an invalid session is submitted", async () => {

        // 1. Simulate an already interrupted process
        const existingProcess = {
            type: "blend" as const,
            phase: "processing" as const,
            operationPhase: "running" as const,
        };

        memorizeProcess(existingProcess);

        // 2. Simulate a corrupted .mx file
        const invalidFile = new Blob(
            ["this is not a valid mx archive"],
            { type: "application/zip" }
        );

        // 3. Attempt reentry
        await expect(
            validateAndProcessReentry(invalidFile)()
        ).rejects.toThrow();

        // 4. The original process must remain untouched
        expect(getMemorizedProcess()).toEqual(existingProcess);

    });

});

