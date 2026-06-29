
from fastapi import FastAPI
from app.api.routes import router

from app.exceptions.handlers import generic_exception_handler

app = FastAPI(
    title="MEXE API",
    description="""
# MEXE

Cloud-native image processing API.

## Features

- Blend two images
- Stateless processing
- In-memory pipeline
- No file persistence

## Pipeline

Upload
↓
Validate
↓
Decode
↓
Normalize
↓
Blend
↓
Encode
↓
Response
""",
    version="0.1.0"
)

app.add_exception_handler(
        Exception,
        generic_exception_handler
        )

app.include_router(router)

@app.get("/")
def home():
    return {
        "message": "MEXE API está funcionando!"
    }
