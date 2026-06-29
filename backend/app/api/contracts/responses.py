
from typing import Any

from app.api.models.error_response import ErrorResponse
from app.api.contracts.health_response import HealthResponse

OpenApiResponses = dict[int | str, dict[str, Any]]

BLEND_RESPONSES: OpenApiResponses = {
    200: {
        "description": "Image successfully blended."
    },    
    415: {
         "description":"Unsupported image format",
         "model":ErrorResponse
    },
    500: {
        "description": "Unexpected server error.",
        "model":ErrorResponse
    },
}

HEALTH_RESPONSES = {
    200: {
        "description": "Service health information.",
        "model": HealthResponse
    },
    503: {
        "description": "Service unavailable.",
        "model": HealthResponse
    }
}
