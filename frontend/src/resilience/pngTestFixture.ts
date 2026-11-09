

const PNG_BYTES = new Uint8Array([
    137, 80, 78, 71, 13, 10, 26, 10,
    0, 0, 0, 13, 73, 72, 68, 82,
    0, 0, 0, 1, 0, 0, 0, 1,
    8, 6, 0, 0, 0, 31, 21, 196,
    137, 0, 0, 0, 11, 73, 68, 65,
    84, 120, 156, 99, 248, 15, 4, 0,
    9, 251, 3, 253, 251, 94, 107, 43,
    0, 0, 0, 0, 73, 69, 78, 68,
    174, 66, 96, 130,
]);

export function createPngBlob(): Blob {
    return new Blob(
        [PNG_BYTES.slice().buffer as ArrayBuffer],
        { type: "image/png" }
    );
}
