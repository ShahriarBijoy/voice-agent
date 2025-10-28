from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional

from models.agent_profile import (
    AgentProfile,
    delete_agent_profile,
    get_agent_profile,
    list_agent_profiles,
    save_agent_profile,
)


class AgentToolConfigSchema(BaseModel):
    id: str
    label: str
    type: str
    enabled: bool = True
    config: dict


class AgentGraphNodeSchema(BaseModel):
    id: str
    type: str
    position: dict
    data: dict | None = None


class AgentGraphEdgeSchema(BaseModel):
    id: str
    source: str
    target: str


class AgentGraphSchema(BaseModel):
    nodes: List[AgentGraphNodeSchema]
    edges: List[AgentGraphEdgeSchema]


class AgentProfileSchema(BaseModel):
    id: Optional[str] = None
    name: str
    description: str = ""
    welcomeMessage: str
    tone: str
    speakingStyle: str
    behavior: str
    tags: List[str] = Field(default_factory=list)
    tools: List[AgentToolConfigSchema]
    graph: AgentGraphSchema
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None


class AgentProfileResponse(BaseModel):
    data: AgentProfileSchema


class AgentProfilesResponse(BaseModel):
    data: List[AgentProfileSchema]


router = APIRouter(prefix="/agents", tags=["agents"])


@router.get("/", response_model=AgentProfilesResponse)
async def list_agents():
    profiles = list_agent_profiles()
    profile_schemas = [AgentProfileSchema(**profile.to_dict()) for profile in profiles]
    return AgentProfilesResponse(data=profile_schemas)


@router.get("/{profile_id}", response_model=AgentProfileResponse)
async def read_agent(profile_id: str):
    profile = get_agent_profile(profile_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Agent profile not found")
    profile_schema = AgentProfileSchema(**profile.to_dict())
    return AgentProfileResponse(data=profile_schema)


@router.post("/", response_model=AgentProfileResponse)
async def create_agent(profile: AgentProfileSchema):
    saved = save_agent_profile(profile.model_dump(exclude_none=True))
    profile_schema = AgentProfileSchema(**saved.to_dict())
    return AgentProfileResponse(data=profile_schema)


@router.put("/{profile_id}", response_model=AgentProfileResponse)
async def update_agent(profile_id: str, profile: AgentProfileSchema):
    existing = get_agent_profile(profile_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Agent profile not found")

    payload = profile.model_dump(exclude_none=True)
    payload.setdefault("createdAt", existing.created_at.isoformat())
    saved = save_agent_profile(payload, profile_id=profile_id)
    profile_schema = AgentProfileSchema(**saved.to_dict())
    return AgentProfileResponse(data=profile_schema)


@router.delete("/{profile_id}")
async def remove_agent(profile_id: str):
    deleted = delete_agent_profile(profile_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Agent profile not found")
    return {"success": True}


