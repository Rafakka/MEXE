import { describe, expect, it } from "vitest";

import type { SessionFile } from "../types/session";

import {
    adaptSessionToRecovery,
} from "./reentryAdapter";

describe("reentryAdapter", () => {

    it("adapts a valid blend session to a recovery process", () => {

        const session: SessionFile = {
            id: "session-123",

            operation: "blend",

            dimensions: {
                width: 1920,
                height: 1080,
            },

            version: "1.0",

            metadata: {
                image_1: {
                    width: 1920,
                    height: 1080,
                    type: "png",
                    size: 1024,
                },

                image_2: {
                    width: 1920,
                    height: 1080,
                    type: "png",
                    size: 2048,
                },

                laboratoryPhase: "processing",
                operationPhase: "running",
            },
        };

        const recovery = adaptSessionToRecovery(session);

        expect(recovery).toEqual({
            type: "blend",
            phase: "processing",
            operationPhase: "running",
        });
    });


    it("preserves the session phases when adapting the recovery process", () => {

        const session: SessionFile = {
            id: "session-456",

            operation: "blend",

            dimensions: {
                width: 1280,
                height: 720,
            },

            version: "1.0",

            metadata: {
                image_1: {
                    type: "jpeg",
                },

                image_2: {
                    type: "jpeg",
                },

                laboratoryPhase: "processing",
                operationPhase: "accelerating",
            },
        };

        const recovery = adaptSessionToRecovery(session);

        expect(recovery.phase)
            .toBe(session.metadata.laboratoryPhase);

        expect(recovery.operationPhase)
            .toBe(session.metadata.operationPhase);
    });


    it("uses the session operation as the recovery process type", () => {

        const session: SessionFile = {
            id: "session-789",

            operation: "blend",

            dimensions: {
                width: 800,
                height: 600,
            },

            version: "1.0",

            metadata: {
                image_1: {},
                image_2: {},

                laboratoryPhase: "processing",
                operationPhase: "collapse",
            },
        };

        const recovery = adaptSessionToRecovery(session);

        expect(recovery.type)
            .toBe(session.operation);
    });

});
