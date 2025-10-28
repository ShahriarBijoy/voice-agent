from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional
import json
import uuid


AGENT_DIRECTORY = Path("agents")
AGENT_DIRECTORY.mkdir(parents=True, exist_ok=True)


@dataclass
class AgentToolConfig:
    id: str
    label: str
    type: str
    enabled: bool
    config: Dict


@dataclass
class AgentGraphNode:
    id: str
    type: str
    position: Dict[str, float]
    data: Dict


@dataclass
class AgentGraphEdge:
    id: str
    source: str
    target: str


@dataclass
class AgentGraph:
    nodes: List[AgentGraphNode]
    edges: List[AgentGraphEdge]


@dataclass
class AgentProfile:
    id: str
    name: str
    description: str
    welcome_message: str
    tone: str
    speaking_style: str
    behavior: str
    tags: List[str]
    tools: List[AgentToolConfig]
    graph: AgentGraph
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)

    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "welcomeMessage": self.welcome_message,
            "tone": self.tone,
            "speakingStyle": self.speaking_style,
            "behavior": self.behavior,
            "tags": self.tags,
            "tools": [
                {
                    "id": tool.id,
                    "label": tool.label,
                    "type": tool.type,
                    "enabled": tool.enabled,
                    "config": tool.config,
                }
                for tool in self.tools
            ],
            "graph": {
                "nodes": [
                    {
                        "id": node.id,
                        "type": node.type,
                        "position": node.position,
                        "data": node.data,
                    }
                    for node in self.graph.nodes
                ],
                "edges": [
                    {
                        "id": edge.id,
                        "source": edge.source,
                        "target": edge.target,
                    }
                    for edge in self.graph.edges
                ],
            },
            "createdAt": self.created_at.isoformat(),
            "updatedAt": self.updated_at.isoformat(),
        }

    @classmethod
    def from_dict(cls, data: Dict) -> "AgentProfile":
        return cls(
            id=data["id"],
            name=data["name"],
            description=data.get("description", ""),
            welcome_message=data["welcomeMessage"],
            tone=data["tone"],
            speaking_style=data.get("speakingStyle", ""),
            behavior=data["behavior"],
            tags=data.get("tags", []),
            tools=[
                AgentToolConfig(
                    id=tool["id"],
                    label=tool["label"],
                    type=tool["type"],
                    enabled=tool.get("enabled", True),
                    config=tool.get("config", {}),
                )
                for tool in data.get("tools", [])
            ],
            graph=AgentGraph(
                nodes=[
                    AgentGraphNode(
                        id=node["id"],
                        type=node["type"],
                        position=node.get("position", {"x": 0, "y": 0}),
                        data=node.get("data", {}),
                    )
                    for node in data.get("graph", {}).get("nodes", [])
                ],
                edges=[
                    AgentGraphEdge(
                        id=edge["id"],
                        source=edge["source"],
                        target=edge["target"],
                    )
                    for edge in data.get("graph", {}).get("edges", [])
                ],
            ),
            created_at=datetime.fromisoformat(data["createdAt"])
            if "createdAt" in data
            else datetime.utcnow(),
            updated_at=datetime.fromisoformat(data["updatedAt"])
            if "updatedAt" in data
            else datetime.utcnow(),
        )


def _profile_path(profile_id: str) -> Path:
    return AGENT_DIRECTORY / f"{profile_id}.json"


def list_agent_profiles() -> List[AgentProfile]:
    profiles = []
    for file in AGENT_DIRECTORY.glob("*.json"):
        try:
            with file.open("r", encoding="utf-8") as handle:
                data = json.load(handle)
            profiles.append(AgentProfile.from_dict(data))
        except Exception as exc:
            print(f"Failed to load agent profile from {file}: {exc}")
    profiles.sort(key=lambda profile: profile.updated_at, reverse=True)
    return profiles


def get_agent_profile(profile_id: str) -> Optional[AgentProfile]:
    path = _profile_path(profile_id)
    if not path.exists():
        return None
    with path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)
    return AgentProfile.from_dict(data)


def save_agent_profile(payload: Dict, profile_id: Optional[str] = None) -> AgentProfile:
    profile_data = payload.copy()
    profile_data.setdefault("id", profile_id or str(uuid.uuid4()))
    profile_data["updatedAt"] = datetime.utcnow().isoformat()
    profile_data.setdefault("createdAt", profile_data["updatedAt"])

    profile = AgentProfile.from_dict(profile_data)
    path = _profile_path(profile.id)
    with path.open("w", encoding="utf-8") as handle:
        json.dump(profile.to_dict(), handle, indent=2, ensure_ascii=False)
    return profile


def delete_agent_profile(profile_id: str) -> bool:
    path = _profile_path(profile_id)
    if path.exists():
        path.unlink()
        return True
    return False


