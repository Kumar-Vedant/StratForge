from fastapi import FastAPI
from schemas import PlanningRequest
from pipeline import generate_planning

app = FastAPI()

@app.post("/generate-planning")
def planning(req: PlanningRequest):

    result = generate_planning(req.projectDescription)

    return result