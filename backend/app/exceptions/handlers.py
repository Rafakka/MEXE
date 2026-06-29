

from fastapi import Request
from fastapi.responses import JSONResponse
from app.api.models.error_response import ErrorResponse

async def generic_exception_handler(
        request: Request,
        exc:Exception
        ):
    error = ErrorResponse (
            error="Internal Server Error",
            message=str(exc),
            path=request.url.path,
            method=request.method
            )

    return JSONResponse(
            status_code=500,
            content=error.model_dump()
            )
