from pydantic import BaseModel


class PlanningRequest(BaseModel):
    projectDescription: str