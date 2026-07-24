
import type { BlendResponse } from "./contracts/blend";
import type { ErrorResponse } from "./contracts/error";
import type { HealthResponse } from "./contracts/health";

export interface ApiResponseMap<T> {
    description: string;
    model: T;
}

export const BLEND_RESPONSES = {
    200: {
        description: "Image successfully blended.",
    } satisfies Omit<ApiResponseMap<BlendResponse>, "model">,

    415: {
        description: "Unsupported image format.",
    } satisfies Omit<ApiResponseMap<ErrorResponse>, "model">,

    500: {
        description: "Unexpected server error.",
    } satisfies Omit<ApiResponseMap<ErrorResponse>, "model">,
};

export const HEALTH_RESPONSES = {
    200: {
        description: "Service health information.",
    } satisfies Omit<ApiResponseMap<HealthResponse>, "model">,

    503: {
        description: "Service unavailable.",
    } satisfies Omit<ApiResponseMap<HealthResponse>, "model">,
};
