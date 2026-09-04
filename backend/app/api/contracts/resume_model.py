from dataclasses import dataclass

@dataclass
class ResumeModel:
    id: str
    operation: str
    image_1: bytes
    image_2: bytes
    width: int
    height: int
    version: str
    metadata: dict
