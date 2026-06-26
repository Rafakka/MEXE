
from fastapi import FastAPI
from app.api.routes import router

app = FastAPI(
    title="MEXE API",
    version="0.1.0"
)

app.include_router(router)

@app.get("/")
def home():
    return {
        "message": "MEXE API está funcionando!"
    }
