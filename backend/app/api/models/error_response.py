

from pydantic import BaseModel, Field

class ErrorResponse(BaseModel):

    error: str = Field(
            description="High-level error category"
            )

    message: str = Field(
            description="Detailed error message"
            )

    path: str = Field(
            description="Http endpoint where error occurred"
            )

    method: str = Field(
            description = "Http method of the failed request"
            )



