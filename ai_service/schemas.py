from pydantic import BaseModel
from typing import List, Optional

class SuggestedTask(BaseModel):
    name: str
    description: str
    source: Optional[str] = None

class PlanningRequest(BaseModel):
    projectDescription: str

class GenerateRoadmapRequest(BaseModel):
    projectDescription: str
    suggestedTasks: List[SuggestedTask] = []

class ResearchOnlineRequest(BaseModel):
    projectDescription: str