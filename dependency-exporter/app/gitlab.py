import os

import httpx


GITLAB_URL = os.getenv("GITLAB_URL", "https://gitlab.com")
GITLAB_PROJECT = os.getenv("GITLAB_PROJECT", "logos-group/mexe")
GITLAB_TOKEN = os.getenv("GITLAB_TOKEN")


async def fetch_open_merge_requests() -> list[dict]:
    if not GITLAB_TOKEN:
        raise RuntimeError("GITLAB_TOKEN is not configured")

    project = GITLAB_PROJECT.replace("/", "%2F")

    url = f"{GITLAB_URL}/api/v4/projects/{project}/merge_requests"

    headers = {
        "PRIVATE-TOKEN": GITLAB_TOKEN,
    }

    params = {
        "state": "opened",
        "per_page": 100,
    }

    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.get(
            url,
            headers=headers,
            params=params,
        )

    response.raise_for_status()

    return response.json()
