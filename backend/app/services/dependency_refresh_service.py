

import os

import httpx


class DependencyRefreshService:
    def __init__(self):
        self.exporter_url = os.getenv("DEPENDENCY_EXPORTER_URL")

    async def refresh(self) -> None:
        if not self.exporter_url:
            raise RuntimeError(
                "DEPENDENCY_EXPORTER_URL is not configured"
            )

        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                f"{self.exporter_url}/refresh"
            )

        response.raise_for_status()
