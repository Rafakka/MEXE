

import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";

import type { AppDispatch } from "../../store/store";

import {
    getProcessHandler,
    unregisterProcess,
} from "../../resilience/processRegistry";

import { performMerge } from "../../features/laboratory/laboratoryThunks";

import { registerLaboratoryEffects } from "./labEffectsController";

vi.mock("../../features/laboratory/laboratoryThunks", () => ({
    performMerge: vi.fn(() => ({
        type: "performMerge",
    })),
}));

describe("labEffectsController", () => {

    const firstFile = new File(
        ["first image"],
        "first.png",
        { type: "image/png" }
    );

    const secondFile = new File(
        ["second image"],
        "second.png",
        { type: "image/png" }
    );

    afterEach(() => {
        unregisterProcess("blend");
        vi.clearAllMocks();
    });

    it("registers the blend process handler", () => {

        const dispatch = vi.fn() as unknown as AppDispatch;

        registerLaboratoryEffects(dispatch);

        const handler = getProcessHandler("blend");

        expect(handler).not.toBeNull();

    });

    it("dispatches performMerge through the registered handler", async () => {

        const dispatch = vi.fn().mockResolvedValue("success") as unknown as AppDispatch;

        registerLaboratoryEffects(dispatch);

        const handler = getProcessHandler("blend");

        expect(handler).not.toBeNull();

        await handler!(firstFile, secondFile);

        expect(performMerge).toHaveBeenCalledOnce();

        expect(performMerge).toHaveBeenCalledWith(
            firstFile,
            secondFile
        );

        expect(dispatch).toHaveBeenCalledOnce();

    });

    it("removes the registered handler when cleanup is called", () => {

        const dispatch = vi.fn() as unknown as AppDispatch;

        const cleanup = registerLaboratoryEffects(dispatch);

        expect(getProcessHandler("blend")).not.toBeNull();

        cleanup();

        expect(getProcessHandler("blend")).toBeNull();

    });

    it("does not leave the handler registered after cleanup", () => {

        const dispatch = vi.fn() as unknown as AppDispatch;

        const cleanup = registerLaboratoryEffects(dispatch);

        cleanup();

        const handler = getProcessHandler("blend");

        expect(handler).toBeNull();

    });

});

