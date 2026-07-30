import { createSlice } from "@reduxjs/toolkit";

 import type { OperationPhase } from "./operationPhase";

import type { LaboratoryPhase } from "./laboratoryPhase";

import type {PayloadAction} from "@reduxjs/toolkit";


export type NotificationType =

    | "info"
    | "success"
    | "warning"
    | "error";


export interface LaboratoryState {

    phase: LaboratoryPhase;

    startupFinished: boolean;

    operationPhase: OperationPhase;

    samples: {

        firstFile: File | null;

        secondFile: File | null;

        firstLoaded: boolean;

        secondLoaded: boolean;

    };

    resultImage: string | null;

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

    samples: {


        firstFile: null,

        secondFile: null,

        firstLoaded: false,

        secondLoaded: false,

    },

    resultImage: null,

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

    loadFirstSample(state, action:PayloadAction<File>) {

        state.samples.firstFile = action.payload;

        state.samples.firstLoaded = true;

    },

    loadSecondSample(state, action:PayloadAction<File>) {

        state.samples.secondFile = action.payload;

        state.samples.secondLoaded = true;

    },

    // DOMAIN EVENTS

    startupCompleted(state) {

        state.startupFinished = true;

        state.phase = "synchronizing";

    },


    mergeStarted(state){

        state.phase = "processing";

        state.operationPhase = "running";

    },

    mergeCompleted(state, action: PayloadAction<string>){

        state.operationPhase = "completed";

        state.resultImage = action.payload;

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

        state.samples.firstFile = null;

        state.samples.secondFile = null;

        state.resultImage = null;

        state.resultVisible = false;

    },

    clearNotification (state) {

        state.notification = null;
    },

    //INTERNAL

    stabilizationStarted(state) {

        state.phase = "stabilizing";
    },

    resultDisplayed(state) {

        state.phase = "result";

        state.resultVisible = true;
    },

    resetStarted(state) {

        state.phase = "resetting";
    },

        }

});


export const {

    activatedExperiment,
    loadFirstSample,
    loadSecondSample,

    startupCompleted,
    mergeStarted,
    mergeCompleted,
    mergeFailed,

    stabilizationStarted,
    resultDisplayed,
    resetStarted,

    clearLaboratory,
    clearNotification,

} = laboratorySlice.actions;

export default laboratorySlice.reducer;
