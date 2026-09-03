import { createSlice } from "@reduxjs/toolkit";

 import type { OperationPhase } from "./operationPhase";

import type { LaboratoryPhase } from "./laboratoryPhase";

import type {PayloadAction} from "@reduxjs/toolkit";

import type {ImageMetadata} from "../../types/imageType";

type MergeResult = {
    url: string;
    metadata: ImageMetadata;
};

export type NotificationType =

    | "info"
    | "success"
    | "warning"
    | "error";

export interface LaboratoryRecoveryState {
    phase: LaboratoryPhase;
    operationPhase: OperationPhase;
}

export interface LaboratoryState {

    phase: LaboratoryPhase;

    startupFinished: boolean;

    operationPhase: OperationPhase;

    recoveryStateBeforeReconnect: LaboratoryRecoveryState | null;

    samples: {

        firstLoaded: boolean;

        secondLoaded: boolean;

    };

    resultImage: string | null;

    resultMetadata: ImageMetadata | null;

    resultVisible: boolean;

    notification: LaboratoryNotification | null;

}

export interface LaboratoryNotification {

    type: NotificationType;

    title: string;

    message: string;

    code?: number;

}

const initialState: LaboratoryState = {

    phase: "idle",

    startupFinished: false,

    operationPhase: "idle",

    recoveryStateBeforeReconnect: null,

    samples: {

        firstLoaded: false,

        secondLoaded: false,

    },

    resultImage: null,

    resultMetadata: null,

    resultVisible: false,

    notification: null,

} satisfies LaboratoryState;

const laboratorySlice = createSlice({

    name:"laboratory",

    initialState,

    reducers: {

    // USER EVENTS

    activatedExperiment(state) {

        state.notification = null;

        state.phase = "activated";

        state.startupFinished = false;
    },

    loadFirstSample(state) {

        state.samples.firstLoaded = true;

    },

    loadSecondSample(state) {

        state.samples.secondLoaded = true;

    },

    acceleratingStarted(state){

        state.operationPhase = "accelerating";
    },

    collapseStarted(state){

        state.operationPhase = "collapse";
    },

    // DOMAIN EVENTS

    startupCompleted(state) {

        state.startupFinished = true;

        state.phase = "synchronizing";

    },

    completedStarted(state){

        state.operationPhase = "completed";
    },


    mergeStarted(state){

        state.phase = "processing";

    },

    mergeCompleted(state, action: PayloadAction<MergeResult>){

        state.operationPhase = "completed";

        state.resultImage = action.payload.url;

        state.resultMetadata = action.payload.metadata;

        state.notification = {

            type: "success",

            title: "Merge Completed",

            message: "Image generated."
        };
    },

    mergeFailed(state, action: PayloadAction<LaboratoryNotification>) {

        state.operationPhase = "failed";

        state.notification = action.payload;
    },

    clearLaboratory(state) {

        state.phase = "idle";

        state.startupFinished = false;

        state.operationPhase = "idle";

        state.samples.firstLoaded = false;

        state.samples.secondLoaded = false;

        state.resultImage = null;

        state.resultVisible = false;

        state.resultMetadata = null;

    },

    clearNotification (state) {

        state.notification = null;
    },

    //INTERNAL

    revealingStarted(state){
        state.operationPhase = "revealing";
    },

    processingRunning(state){
        state.operationPhase = "running";
    },

    resultDisplayed(state) {

        state.phase = "result";

        state.resultVisible = true;
    },

    resetStarted(state) {

        state.phase = "resetting";
    },

    reconnectingStarted(state) {

        if (state.recoveryStateBeforeReconnect === null) {

        state.recoveryStateBeforeReconnect = {
            phase: state.phase,
            operationPhase: state.operationPhase,
            };
        }

        state.operationPhase = "reconnecting";

        state.notification = {
        type: "warning",
        title: "Backend Unavailable",
        message: "Attempting to restore connection..."
        };
    },

    backendOffline(state) {

    state.operationPhase = "offline";

    state.notification = {

        type: "error",

        title: "Backend Offline",

        message: "The backend is offline or not responding."
        };
    },

   backendRecovered(state) {

    console.log(
        ">>> Recovering laboratory state:",
        state.recoveryStateBeforeReconnect
    );

    if (state.recoveryStateBeforeReconnect) {

        state.phase =
            state.recoveryStateBeforeReconnect.phase;

        state.operationPhase =
            state.recoveryStateBeforeReconnect.operationPhase;
    }

    state.notification = {

        type: "success",

        title: "Backend Online",

        message: "Resuming operation."
    };

    state.recoveryStateBeforeReconnect = null;

        },
    }
});

export const {

    activatedExperiment,
    loadFirstSample,
    loadSecondSample,

    startupCompleted,
    completedStarted,
    mergeStarted,
    mergeCompleted,
    mergeFailed,
    acceleratingStarted,
    collapseStarted,

    revealingStarted,
    processingRunning,
    resultDisplayed,
    resetStarted,

    reconnectingStarted,
    backendRecovered,
    backendOffline,

    clearLaboratory,
    clearNotification,

} = laboratorySlice.actions;

export default laboratorySlice.reducer;
