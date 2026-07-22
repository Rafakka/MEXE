import { createSlice } from "@reduxjs/toolkit";

const initialState = {

    phase: "idle",

    startupFinished: false,

    operationPhase: "idle",

    samples: {

        firstLoaded: false,

        secondLoaded: false,

    },

    mergeResult: null,

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

    loadFirstSample(state) {

        state.samples.firstLoaded = true;

    },

    loadSecondSample(state) {

        state.samples.secondLoaded = true;

    },

    setMergeResult(state, action) {

        state.mergeResult = action.payload;

    },

    clearLaboratory(state) {

        state.phase = "idle";

        state.startupFinished = false;

        state.operationPhase = "idle";

        state.samples.firstLoaded = false;

        state.samples.secondLoaded = false;

        state.mergeResult = null;

        }

    }
});

export const {

    setPhase,

    setStartupFinished,

    setOperationPhase,

    loadFirstSample,

    loadSecondSample,

    setMergeResult,

    clearLaboratory

} = laboratorySlice.actions;

export default laboratorySlice.reducer;
