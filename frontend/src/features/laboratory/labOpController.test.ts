

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { AppDispatch } from "../../store/store";
import type { LabContext } from "../../components/Laboratory/labContext";

import {
    readyToProcess,
    startProcessing,
    manualRetry,
    manualReentry,
} from "../../features/laboratory/laboratoryThunks";

import {
    startOperation,
    retryOperation,
} from "../../components/Laboratory/labOpController";

vi.mock("../../features/laboratory/laboratoryThunks", () => ({
    readyToProcess: vi.fn((operation) => ({
        type: "readyToProcess",
        payload: operation,
    })),

    startProcessing: vi.fn((operation, firstFile, secondFile) => ({
        type: "startProcessing",
        payload: { operation, firstFile, secondFile },
    })),

    manualRetry: vi.fn((firstFile, secondFile) => ({
        type: "manualRetry",
        payload: { firstFile, secondFile },
    })),

    manualReentry: vi.fn((operation, firstFile, secondFile) => ({
        type: "manualReentry",
        payload: { operation, firstFile, secondFile },
    })),
}));

describe("labOpController", () => {

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

    let dispatchMock: ReturnType<typeof vi.fn>;
    let dispatch: AppDispatch;

    beforeEach(() => {
        vi.clearAllMocks();

        dispatchMock = vi.fn((action) => action);
        dispatch = dispatchMock as unknown as AppDispatch;
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    const createContext = (
        mode: "stateless" | "reentry",
        first: File | null = firstFile,
        second: File | null = secondFile
    ): LabContext => ({
        operation: "blend",
        mode,
        firstFile: first,
        secondFile: second,
    });

    describe("startOperation", () => {

        it("dispatches preparation before starting processing", async () => {

            const context = createContext("stateless");

            const result = await startOperation(
                context,
                dispatch
            );

            expect(readyToProcess)
                .toHaveBeenCalledOnce();

            expect(readyToProcess)
                .toHaveBeenCalledWith("blend");

            expect(startProcessing)
                .toHaveBeenCalledOnce();

            expect(startProcessing)
                .toHaveBeenCalledWith(
                    "blend",
                    firstFile,
                    secondFile
                );

            expect(dispatchMock)
                .toHaveBeenCalledTimes(2);

            const firstDispatch = dispatchMock.mock.calls[0][0];
            const secondDispatch = dispatchMock.mock.calls[1][0];

            expect(firstDispatch.type)
                .toBe("readyToProcess");

            expect(secondDispatch.type)
                .toBe("startProcessing");

            expect(result)
                .toEqual(secondDispatch);
        });

        it("rejects when the first file is missing", async () => {

            const context = createContext(
                "stateless",
                null,
                secondFile
            );

            await expect(
                startOperation(context, dispatch)
            ).rejects.toThrow(
                "Cannot start operation without both files"
            );

            expect(dispatchMock).not.toHaveBeenCalled();
        });

        it("rejects when the second file is missing", async () => {

            const context = createContext(
                "stateless",
                firstFile,
                null
            );

            await expect(
                startOperation(context, dispatch)
            ).rejects.toThrow(
                "Cannot start operation without both files"
            );

            expect(dispatchMock).not.toHaveBeenCalled();
        });

        it("does not start processing if preparation fails", async () => {

            const context = createContext("stateless");
            const error = new Error("Preparation failed");

            dispatchMock.mockImplementationOnce(
                () => Promise.reject(error)
            );

            await expect(
                startOperation(context, dispatch)
            ).rejects.toThrow("Preparation failed");

            expect(readyToProcess)
                .toHaveBeenCalledOnce();

            expect(startProcessing)
                .not.toHaveBeenCalled();

            expect(dispatchMock)
                .toHaveBeenCalledOnce();
        });
    });

    describe("retryOperation", () => {

        it("uses manualRetry in stateless mode", () => {

            const context = createContext("stateless");

            retryOperation(context, dispatch);

            expect(manualRetry)
                .toHaveBeenCalledOnce();

            expect(manualRetry)
                .toHaveBeenCalledWith(
                    firstFile,
                    secondFile
                );

            expect(manualReentry)
                .not.toHaveBeenCalled();

            expect(dispatchMock)
                .toHaveBeenCalledOnce();
        });

        it("uses manualReentry in reentry mode", () => {

            const context = createContext("reentry");

            retryOperation(context, dispatch);

            expect(manualReentry)
                .toHaveBeenCalledOnce();

            expect(manualReentry)
                .toHaveBeenCalledWith(
                    "blend",
                    firstFile,
                    secondFile
                );

            expect(manualRetry)
                .not.toHaveBeenCalled();

            expect(dispatchMock)
                .toHaveBeenCalledOnce();
        });

        it.each([
            ["stateless", "manual retry"],
            ["reentry", "manual reentry"],
        ] as const)(
            "rejects %s retry when a file is missing",
            (mode) => {

                const context = createContext(
                    mode,
                    firstFile,
                    null
                );

                expect(() => {
                    retryOperation(context, dispatch);
                }).toThrow(
                    "Cannot retry operation without both files"
                );

                expect(dispatchMock)
                    .not.toHaveBeenCalled();

                expect(manualRetry)
                    .not.toHaveBeenCalled();

                expect(manualReentry)
                    .not.toHaveBeenCalled();
            }
        );
    });
});

