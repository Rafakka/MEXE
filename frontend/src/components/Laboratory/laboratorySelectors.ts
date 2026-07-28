

import type { RootState } from "../../store/store";

export const selectSamplesReady = (state: RootState) =>

    state.laboratory.samples.firstLoaded &&
    state.laboratory.samples.secondLoaded;

export const selectHasErrorNotification = (
    state:RootState
) => state.laboratory.notification?.type === "error";
