

import JSZip from "jszip";

import type { SessionFile } from "./saveSession";

    export class SessionValidator {

    public validateSession(
        session: SessionFile
    ): void {

        this.validateOperation(session);
    }


    public async validateFile(
        file: Blob
    ): Promise<void> {

    const zip = await this.openZip(file);

    this.validateStructure(zip);

    const operationJson =
        await this.readOperationJson(zip);

    this.validateOperation(operationJson);

    await this.validateImages(zip);

    }

    private async openZip(file: Blob): Promise<JSZip> {

        try {

            return await JSZip.loadAsync(file);

        } catch {

            throw new Error(
                "Invalid session file"
            );

        }
    }


    private validateStructure(zip: JSZip): void {

        const requiredFiles = [
            "operation.json",
            "image_1.png",
            "image_2.png"
        ];

        for (const file of requiredFiles) {

            if (!zip.file(file)) {

                throw new Error(
                    `Missing required session file: ${file}`
                );
            }
        }
    }


    private async readOperationJson(
        zip: JSZip
    ): Promise<unknown> {

        const file = zip.file("operation.json");

        if (!file) {

            throw new Error(
                "Missing operation.json"
            );
        }

        try {

            const content =
                await file.async("string");

            return JSON.parse(content);

        } catch {

            throw new Error(
                "Invalid operation.json"
            );
        }
    }


    private validateOperation(
        operation: unknown
    ): void {

        if (
            typeof operation !== "object" ||
            operation === null
        ) {

            throw new Error(
                "Invalid operation definition"
            );
        }

        const data =
            operation as Record<string, unknown>;

        if (typeof data.id !== "string") {

            throw new Error(
                "Invalid session id"
            );
        }

        if (typeof data.operation !== "string") {

            throw new Error(
                "Invalid session operation"
            );
        }

        if (
            typeof data.version !== "string"
        ) {

            throw new Error(
                "Invalid session version"
            );
        }

        if (
            typeof data.dimensions !== "object" ||
            data.dimensions === null
        ) {

            throw new Error(
                "Invalid session dimensions"
            );
        }

        const dimensions =
            data.dimensions as Record<string, unknown>;

        if (
            typeof dimensions.width !== "number" ||
            typeof dimensions.height !== "number"
        ) {

            throw new Error(
                "Invalid session dimensions"
            );
        }

        if (
            typeof data.metadata !== "object" ||
            data.metadata === null
        ) {

            throw new Error(
                "Invalid session metadata"
            );
        }
    }


    private async validateImages(
        zip: JSZip
    ): Promise<void> {

        await this.validatePng(
            zip,
            "image_1.png"
        );

        await this.validatePng(
            zip,
            "image_2.png"
        );
    }


    private async validatePng(
        zip: JSZip,
        filename: string
    ): Promise<void> {

    const file = zip.file(filename);

    if (!file) {

        throw new Error(
            `Missing image: ${filename}`
        );
    }

    const blob =
        await file.async("blob");

    const buffer =
        await blob.arrayBuffer();

    const bytes =
        new Uint8Array(buffer);

    const pngSignature = [
        0x89,
        0x50,
        0x4E,
        0x47,
        0x0D,
        0x0A,
        0x1A,
        0x0A
    ];

    const isPng =
        pngSignature.every(
            (byte, index) =>
                bytes[index] === byte
        );

    if (!isPng) {

        throw new Error(
            `Invalid image format: ${filename}`
        );

        }
    }
}
