
import JSZip from "jszip";

import {
    SESSION_VERSION,
    type SessionFile,
} from "../types/session";

export type ValidatedSessionFile = {
    session: SessionFile;
    image1: Blob;
    image2: Blob;
};

const VALID_LABORATORY_PHASES = [
    "idle",
    "activated",
    "synchronizing",
    "processing",
    "stabilizing",
    "result",
    "resettingProcess",
    "resettingLab",
] as const;

const VALID_OPERATION_PHASES = [
    "idle",
    "pending",
    "revealing",
    "running",
    "accelerating",
    "collapse",
    "completed",
    "processing",
    "reconnecting",
    "offline",
    "failed",
] as const;

function isRecord(
    value: unknown
): value is Record<string, unknown> {
    return (
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(value)
    );
}

function isAllowedValue<T extends readonly string[]>(
    value: unknown,
    allowed: T
): value is T[number] {
    return (
        typeof value === "string" &&
        (allowed as readonly string[]).includes(value)
    );
}

export class SessionValidator {

    public validateSession(
        session: unknown
    ): asserts session is SessionFile {

        this.validateOperation(session);
    }

    public async validateFile(
        file: Blob
    ): Promise<ValidatedSessionFile> {

        const zip = await this.openZip(file);

        this.validateStructure(zip);

        const session = await this.readOperationJson(zip);

        this.validateSession(session);

        const image1 = await this.readPng(
            zip,
            "image_1.png"
        );

        const image2 = await this.readPng(
            zip,
            "image_2.png"
        );

        return {
            session,
            image1,
            image2,
        };
    }

    private async openZip(
        file: Blob
    ): Promise<JSZip> {

        try {
            return await JSZip.loadAsync(file);
        } catch {
            throw new Error("Invalid session file");
        }
    }

    private validateStructure(
        zip: JSZip
    ): void {

        const requiredFiles = [
            "operation.json",
            "image_1.png",
            "image_2.png",
        ];

        for (const filename of requiredFiles) {

            if (!zip.file(filename)) {
                throw new Error(
                    `Missing required session file: ${filename}`
                );
            }
        }
    }

    private async readOperationJson(
        zip: JSZip
    ): Promise<unknown> {

        const file = zip.file("operation.json");

        if (!file) {
            throw new Error("Missing operation.json");
        }

        try {
            const content = await file.async("string");

            return JSON.parse(content) as unknown;

        } catch {
            throw new Error("Invalid operation.json");
        }
    }

    private validateOperation(
        operation: unknown
    ): asserts operation is SessionFile {

        if (!isRecord(operation)) {
            throw new Error("Invalid operation definition");
        }

        if (
            typeof operation.id !== "string" ||
            operation.id.trim() === ""
        ) {
            throw new Error("Invalid session id");
        }

        if (operation.operation !== "blend") {
            throw new Error("Unsupported session operation");
        }

        if (operation.version !== SESSION_VERSION) {
            throw new Error("Unsupported session version");
        }

        if (!isRecord(operation.dimensions)) {
            throw new Error("Invalid session dimensions");
        }

        const { width, height } = operation.dimensions;

        if (
            typeof width !== "number" ||
            !Number.isInteger(width) ||
            width <= 0 ||
            typeof height !== "number" ||
            !Number.isInteger(height) ||
            height <= 0
        ) {
            throw new Error("Invalid session dimensions");
        }

        if (!isRecord(operation.metadata)) {
            throw new Error("Invalid session metadata");
        }

        const metadata = operation.metadata;

        this.validateImageMetadata(
            metadata.image_1,
            "image_1"
        );

        this.validateImageMetadata(
            metadata.image_2,
            "image_2"
        );

        if (!isAllowedValue(
            metadata.laboratoryPhase,
            VALID_LABORATORY_PHASES
        )) {
            throw new Error("Invalid laboratory phase");
        }

        if (!isAllowedValue(
            metadata.operationPhase,
            VALID_OPERATION_PHASES
        )) {
            throw new Error("Invalid operation phase");
        }
    }

    private validateImageMetadata(
        image: unknown,
        filename: string
    ): void {

        if (!isRecord(image)) {
            throw new Error(`Invalid metadata: ${filename}`);
        }

        for (const field of ["name", "type"]) {

            const value = image[field];

            if (
                value !== undefined &&
                typeof value !== "string"
            ) {
                throw new Error(
                    `Invalid image metadata ${field}: ${filename}`
                );
            }
        }

        for (const field of ["width", "height", "size"]) {

            const value = image[field];

            if (
                value !== undefined &&
                (
                    typeof value !== "number" ||
                    !Number.isFinite(value) ||
                    value <= 0
                )
            ) {
                throw new Error(
                    `Invalid image metadata ${field}: ${filename}`
                );
            }
        }
    }

    private async readPng(
        zip: JSZip,
        filename: string
    ): Promise<Blob> {

        const file = zip.file(filename);

        if (!file) {
            throw new Error(`Missing image: ${filename}`);
        }

        const blob = await file.async("blob");

        await this.validatePng(blob, filename);

        return blob;
    }

    private async validatePng(
        blob: Blob,
        filename: string
    ): Promise<void> {

        const buffer = await blob.arrayBuffer();

        const bytes = new Uint8Array(buffer);

        const pngSignature = [
            0x89,
            0x50,
            0x4E,
            0x47,
            0x0D,
            0x0A,
            0x1A,
            0x0A,
        ];

        const isPng = pngSignature.every(
            (byte, index) => bytes[index] === byte
        );

        if (!isPng) {
            throw new Error(
                `Invalid image format: ${filename}`
            );
        }
    }
}

