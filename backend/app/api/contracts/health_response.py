

from pydantic import BaseModel
from app.domain.health_status import HealthStatus

class HealthResponse(BaseModel):
    status: HealthStatus

