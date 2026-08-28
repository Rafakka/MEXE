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
    renovate_updates,
    renovate_conflicts,
    renovate_oldest_mr_age_seconds,
)
from app.renovate import (
    get_renovate_merge_requests,
    parse_renovate_merge_request,
    get_oldest_renovate_mr_age_seconds,
    is_renovate_merge_request,
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

    oldest_mr_age = get_oldest_renovate_mr_age_seconds(
    merge_requests
    )

    renovate_oldest_mr_age_seconds.set(oldest_mr_age)

    parsed_updates = [
        parse_renovate_merge_request(merge_request)
        for merge_request in renovate_mrs
    ]

    parsed_updates = [
        update
        for update in parsed_updates
        if update is not None
    ]

    update_types = {
    "major": 0,
    "minor": 0,
    "patch": 0,
    "unknown": 0,
    }

    for update in parsed_updates:
        update_types[update["update_type"]] += 1

    for update_type, count in update_types.items():
        renovate_updates.labels(
            update_type=update_type
        ).set(count)

    renovate_conflicts.set(
    sum(
        1
        for merge_request in renovate_mrs
        if merge_request.get("has_conflicts", False)
        )
    )


    return Response(
            content=generate_latest(),
            media_type="text/plain",
        )
