

import { describe, expect, it, beforeEach, vi } from "vitest";

import {
    registerProcess,
    getProcessHandler,
    unregisterProcess,
} from "./processRegistry";

describe("process registry", () => {

    beforeEach(() => {
        unregisterProcess("blend");
    });

    it("registers and retrieves a process handler", () => {

        const handler = vi.fn().mockResolvedValue(undefined);

        registerProcess("blend", handler);

        const registeredHandler = getProcessHandler("blend");

        expect(registeredHandler).toBe(handler);
    });

    it("unregisters a process handler", () => {

    const handler = vi.fn().mockResolvedValue(undefined);

    registerProcess("blend", handler);

    expect(getProcessHandler("blend")).toBe(handler);

    unregisterProcess("blend");

    expect(getProcessHandler("blend")).toBeNull();

    });


});
