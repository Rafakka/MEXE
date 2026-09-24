import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";

import {
    resumeProcess,
} from "../features/laboratory/laboratoryThunks";

import {
    memorizeProcess,
    forgetProcess,
} from "./resilienceMemory";

import {
    registerProcess,
    unregisterProcess,
} from "./processRegistry";


describe("resumeProcess", () => {

    afterEach(() => {
        forgetProcess();
        unregisterProcess("blend");
        unregisterProcess("unknown");
    });


    it("returns none when there is no interrupted process", async () => {

        const result = await resumeProcess()();

        expect(result).toBe("none");

    });


    it("returns failed when no recovery handler is registered", async () => {

        memorizeProcess({
            type: "unknown",
            phase: "processing",
            operationPhase: "running",
        });

        const result = await resumeProcess()();

        expect(result).toBe("failed");

    });


    it("resumes the interrupted process successfully", async () => {

        const handler = vi.fn(
            async () => {}
        );

        memorizeProcess({
            type: "blend",
            phase: "processing",
            operationPhase: "running",
        });

        registerProcess(
            "blend",
            handler
        );

        const result = await resumeProcess()();

        expect(result).toBe("success");

        expect(handler).toHaveBeenCalledOnce();

        const resultAfterResume =
            await resumeProcess()();

        expect(resultAfterResume).toBe("none");

    });


    it("returns failed when the recovery handler throws", async () => {

        const handler = vi.fn(
            async () => {
                throw new Error("Recovery failed");
            }
        );

        memorizeProcess({
            type: "blend",
            phase: "processing",
            operationPhase: "running",
        });

        registerProcess(
            "blend",
            handler
        );

        const result = await resumeProcess()();

        expect(result).toBe("failed");

        expect(handler).toHaveBeenCalledOnce();

        const resultAfterFailure =
            await resumeProcess()();

        expect(resultAfterFailure).toBe("failed");

    });

});
