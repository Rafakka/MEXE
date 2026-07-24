

import { ENDPOINTS } from "./endpoints";
import { get, post } from "./http";

import type { BlendResponse } from "./contracts/blend";
import type { HealthResponse } from "./contracts/health";

export async function health() {

    return get<HealthResponse>(
        ENDPOINTS.HEALTH
    );

}

export async function blend(

    firstFile: File,

    secondFile: File

) {

    const formData = new FormData();

    formData.append("first_image", firstFile);

    formData.append("second_image", secondFile);

    return post<BlendResponse>(
        ENDPOINTS.BLEND,
        formData
    );

}

export const mexeApi = {

    health,

    blend,
};


