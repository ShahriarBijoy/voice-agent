import { NextRequest, NextResponse } from "next/server";
import {
  agentProfileDraftSchema,
} from "@/lib/schemas/agent";
import { API_URL } from "@/lib/config";

const API_BASE = API_URL;

export async function GET() {
  const res = await fetch(`${API_BASE}/api/agents/`, { cache: "no-store" });
  if (!res.ok) {
    return NextResponse.json(
      { error: "Failed to fetch agents" },
      { status: res.status },
    );
  }
  const data = await res.json();
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = agentProfileDraftSchema.parse(body);
  const res = await fetch(`${API_BASE}/api/agents/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(parsed),
  });

  if (!res.ok) {
    return NextResponse.json(
      { error: "Failed to create agent" },
      { status: res.status },
    );
  }
  const data = await res.json();
  return NextResponse.json(data, { status: 201 });
}


