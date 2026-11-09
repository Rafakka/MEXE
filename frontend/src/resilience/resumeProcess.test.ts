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
    getMemorizedProcess,
    memorizeProcess,
    forgetProcess,
} from "./resilienceMemory";

import type { ProcessResult} from "./processRegistry";

import {
    registerProcess,
    unregisterProcess,
} from "./processRegistry";


describe("resumeProcess", () => {

    afterEach(() => {
        vi.clearAllMocks();
        forgetProcess();
        unregisterProcess("blend");
    });

    const firstFile = new File(
    ["image"],
    "first.png"
    );

    const secondFile = new File(
    ["image"],
    "second.png"
    );


    it("returns none when there is no interrupted process", async () => {

        const result = await resumeProcess(firstFile, secondFile)();

        expect(result).toBe("none");

    });


    it("resumes the interrupted process successfully", async () => {

        const handler = vi.fn(
            async ():Promise<ProcessResult> => "success"
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

        const result = await resumeProcess(firstFile, secondFile)();

        expect(result).toBe("success");

        expect(handler).toHaveBeenCalledOnce();

        const resultAfterResume =
            await resumeProcess(firstFile, secondFile)();

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

        const result = await resumeProcess(firstFile, secondFile)();

        expect(result).toBe("failed");

        expect(handler).toHaveBeenCalledOnce();

        const resultAfterFailure =
            await resumeProcess(firstFile, secondFile)();

        expect(resultAfterFailure).toBe("failed");

    });

    it("preserves the interrupted process when the handler returns failed", async () => {

        const process = {
            type: "blend" as const,
            phase: "processing" as const,
            operationPhase: "running" as const,
        };

        const handler = vi.fn(
            async (): Promise<ProcessResult> => "failed"
        );

        memorizeProcess(process);

        registerProcess(
            "blend",
            handler
        );

        const result = await resumeProcess(
            firstFile,
            secondFile
        )();

        expect(result).toBe("failed");

        expect(handler).toHaveBeenCalledOnce();

        expect(getMemorizedProcess()).toEqual(process);

    });

});

