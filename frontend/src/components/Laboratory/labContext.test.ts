
import { describe, expect, it } from "vitest";

import {
    createLabContext,
    resetLabContext,
} from "./labContext";

describe("labContext", () => {

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

    it("creates a context with the supplied operation, mode and files", () => {

        const context = createLabContext(
            "blend",
            "stateless",
            firstFile,
            secondFile
        );

        expect(context).toEqual({
            operation: "blend",
            mode: "stateless",
            firstFile,
            secondFile,
        });

    });

    it("preserves null files when the context is incomplete", () => {

        const context = createLabContext(
            "blend",
            "stateless",
            null,
            secondFile
        );

        expect(context.firstFile).toBeNull();
        expect(context.secondFile).toBe(secondFile);

    });

    it("creates a reentry context without modifying the supplied files", () => {

        const context = createLabContext(
            "blend",
            "reentry",
            firstFile,
            secondFile
        );

        expect(context.mode).toBe("reentry");
        expect(context.firstFile).toBe(firstFile);
        expect(context.secondFile).toBe(secondFile);

    });

    it("resets the context while preserving the selected operation", () => {

        const context = createLabContext(
            "blend",
            "reentry",
            firstFile,
            secondFile
        );

        const resetContext = resetLabContext(context);

        expect(resetContext).toEqual({
            operation: "blend",
            mode: "stateless",
            firstFile: null,
            secondFile: null,
        });

    });

    it("does not mutate the original context when resetting", () => {

        const context = createLabContext(
            "blend",
            "reentry",
            firstFile,
            secondFile
        );

        resetLabContext(context);

        expect(context.mode).toBe("reentry");
        expect(context.firstFile).toBe(firstFile);
        expect(context.secondFile).toBe(secondFile);

    });

});

