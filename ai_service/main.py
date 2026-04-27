from fastapi import FastAPI
from schemas import GenerateRoadmapRequest, ResearchOnlineRequest
from pipeline import research_online, build_roadmap
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# allow requests from Node.js backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"message": "AI service is running!"}

@app.post("/research-online")
def research(req: ResearchOnlineRequest):
    result = research_online(req.projectDescription)
    return result

@app.post("/generate-roadmap")
def roadmap(req: GenerateRoadmapRequest):
    suggested_dicts = [{"name": t.name, "description": t.description, "source": t.source} for t in req.suggestedTasks]
    result = build_roadmap(req.projectDescription, suggested_dicts)
    return result