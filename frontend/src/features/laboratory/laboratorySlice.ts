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

    operationPhase: OperationPhase;

}

export interface LaboratoryNotification {

    type: NotificationType;

    title: string;

    message: string;

    code?: number;

}

const initialState = {

    phase: "idle",

    startupFinished: false,

    operationPhase: "idle",

    samples: {


        firstFile: null,

        secondFile: null,

        firstLoaded: false,

        secondLoaded: false,

    },

    mergeResult: null,

    resultVisible: false,

    notification: null as LaboratoryNotification | null,

};

const laboratorySlice = createSlice({

    name:"laboratory",

    initialState,

    reducers: {

    // USER EVENTS

    startExperiment(state) {

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

    mergeCompleted(state, action: PayloadAction<BlendResult>){

        state.operationPhase = "completed";

        state.mergeResult = action.payload;

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

        state.mergeResult = null;

        state.resultVisible = false;

    },

    //INTERNAL

    setPhase(state, action) {

        state.phase = action.payload;
    },

    setOperationPhase(state, action) {

        state.operationPhase = action.payload;

    },

    setMergeResult(state, action) {

        state.mergeResult = action.payload;

    },

    setNotification(state, action:PayloadAction<LaboratoryNotification>)
    {
      state.notification = action.payload;
    },

    clearNotification(state) {

        state.notification = null;
    },

    setResultVisible(state, action: PayloadAction<boolean>)
    {
        state.resultVisible = action.payload;
    },

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

    startExperiment,

    loadFirstSample,

    loadSecondSample,

    startupCompleted,

    mergeStarted,

    mergeCompleted,

    mergeFailed,

    clearLaboratory,

    stabilizationStarted,

    resultDisplayed,

    resetStarted,


} = laboratorySlice.actions;

export default laboratorySlice.reducer;
