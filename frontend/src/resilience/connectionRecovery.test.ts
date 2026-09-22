import { describe, expect, it, vi } from "vitest";

import { recoverConnection } from "./connectionRecovery";

describe("connection recovery", () => {

    it("returns true when the backend is available on the first attempt", async () => {

        const fetchMock = vi
            .spyOn(globalThis, "fetch")
            .mockResolvedValue(
                new Response(null, { status: 200 })
            );

        const result = await recoverConnection();

        expect(result).toBe(true);

        expect(fetchMock).toHaveBeenCalledOnce();

        expect(fetchMock).toHaveBeenCalledWith(
            "/api/ready"
        );
    });

    it("recovers when the first attempt fails and the second succeeds", async () => {

    const fetchMock = vi
        .spyOn(globalThis, "fetch")
        .mockRejectedValueOnce(
            new Error("Backend unavailable")
        )
        .mockResolvedValueOnce(
            new Response(null, { status: 200 })
        );

    const result = await recoverConnection();

    expect(result).toBe(true);

    expect(fetchMock).toHaveBeenCalledTimes(2);

    expect(fetchMock).toHaveBeenNthCalledWith(
        1,
        "/api/ready"
    );

    expect(fetchMock).toHaveBeenNthCalledWith(
        2,
        "/api/ready"
    );

    });

    it("returns false when all recovery attempts fail", async () => {

    const fetchMock = vi
        .spyOn(globalThis, "fetch")
        .mockRejectedValue(
            new Error("Backend unavailable")
        );

    const result = await recoverConnection();

    expect(result).toBe(false);

    expect(fetchMock).toHaveBeenCalledTimes(3);

    expect(fetchMock).toHaveBeenNthCalledWith(
        1,
        "/api/ready"
    );

    expect(fetchMock).toHaveBeenNthCalledWith(
        2,
        "/api/ready"
    );

    expect(fetchMock).toHaveBeenNthCalledWith(
        3,
        "/api/ready"
    );

    });

    it("retries when the backend responds with 503", async () => {

    const fetchMock = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(
            new Response(null, { status: 503 })
        )
        .mockResolvedValueOnce(
            new Response(null, { status: 200 })
        );

    const result = await recoverConnection();

    expect(result).toBe(true);

    expect(fetchMock).toHaveBeenCalledTimes(2);

    });

});
