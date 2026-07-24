import { createSlice } from "@reduxjs/toolkit";

import type {PayloadAction} from "@reduxjs/toolkit";

interface SamplesState {
    firstFile: File | null;
    secondFile: File | null;
    firstLoaded: boolean;
    secondLoaded: boolean;
}

export type NotificationType =

    | "info"
    | "success"
    | "warning"
    | "error";

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

    setPhase(state, action) {

        state.phase = action.payload;

    },

    setStartupFinished(state, action) {

        state.startupFinished = action.payload;

    },

    setOperationPhase(state, action) {

        state.operationPhase = action.payload;

    },

    loadFirstSample(state, action:PayloadAction<File>) {

        state.samples.firstFile = action.payload;

        state.samples.firstLoaded = true;

    },

    loadSecondSample(state, action:PayloadAction<File>) {

        state.samples.secondFile = action.payload;

        state.samples.secondLoaded = true;

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

    clearLaboratory(state) {

        state.phase = "idle";

        state.startupFinished = false;

        state.operationPhase = "idle";

        state.samples.firstLoaded = false;

        state.samples.secondLoaded = false;

        state.mergeResult = null;

        state.resultVisible = false;

        }

    }

    });

export const {

    setPhase,

    setStartupFinished,

    setOperationPhase,

    setResultVisible,

    loadFirstSample,

    loadSecondSample,

    setMergeResult,

    setNotification,

    clearNotification,

    clearLaboratory

} = laboratorySlice.actions;

export default laboratorySlice.reducer;
