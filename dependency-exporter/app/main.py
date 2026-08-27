import os
import time
from fastapi import FastAPI, Response
from prometheus_client import generate_latest

from app.gitlab import fetch_open_merge_requests
from app.metrics import (
    gitlab_api_duration,
    gitlab_api_errors,
    gitlab_api_success,
    renovate_open_mrs,
    renovate_major_updates,
    renovate_security_updates,
)
from app.renovate import (
    get_renovate_merge_requests,
    parse_renovate_merge_request,
)

app = FastAPI()

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.get("/ready")
async def ready():
    if not os.getenv("GITLAB_TOKEN"):
        return Response(
            content='{"status":"not ready","reason":"GITLAB_TOKEN is not configured"}',
            media_type="application/json",
            status_code=503,
        )

    if not os.getenv("GITLAB_PROJECT"):
        return Response(
            content='{"status":"not ready","reason":"GITLAB_PROJECT is not configured"}',
            media_type="application/json",
            status_code=503,
        )

    if not os.getenv("GITLAB_URL"):
        return Response(
            content='{"status":"not ready","reason":"GITLAB_URL is not configured"}',
            media_type="application/json",
            status_code=503,
        )

    return {"status": "ready"}

@app.get("/metrics")
async def metrics():

    start =  time.perf_counter()

    try:

        merge_requests = await fetch_open_merge_requests()

    except Exception:

        duration = time.perf_counter() - start

        gitlab_api_duration.observe(duration)
        gitlab_api_success.set(0)
        gitlab_api_errors.inc()

        return Response(
                content=generate_latest(),
                media_type="text/plain",
                )

    duration = time.perf_counter() - start

    gitlab_api_duration.observe(duration)

    gitlab_api_success.set(1)

    renovate_mrs = get_renovate_merge_requests(merge_requests)

    renovate_open_mrs.set(len(renovate_mrs))

    parsed_updates = [
        parse_renovate_merge_request(merge_request)
        for merge_request in renovate_mrs
    ]

    parsed_updates = [
        update
        for update in parsed_updates
        if update is not None
    ]

    renovate_major_updates.set(
        sum(
            1
            for update in parsed_updates
            if update["update_type"] == "major"
        )
    )

    renovate_security_updates.set(0)

    return Response(
            content=generate_latest(),
            media_type="text/plain",
        )
