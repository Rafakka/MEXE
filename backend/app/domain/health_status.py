
from  enum import Enum

class HealthStatus(Enum):
    UP = "UP"
    DOWN = "DOWN"
    STARTING = "STARTING"
    DEGRADED = "DEGRADED"
