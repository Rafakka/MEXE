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

    sampleArrivals: number;

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

    sampleArrivals: 0,

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

    sampleArrived(state){
        state.sampleArrivals++;
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

    mergeCompleted(state, action: PayloadAction<string>){

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

        state.sampleArrivals = 0;
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

        }

});


export const {

    activatedExperiment,
    loadFirstSample,
    loadSecondSample,

    sampleArrived,
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

    clearLaboratory,
    clearNotification,

} = laboratorySlice.actions;

export default laboratorySlice.reducer;
