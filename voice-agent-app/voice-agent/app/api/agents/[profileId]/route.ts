import { NextRequest, NextResponse } from "next/server";
import { agentProfileDraftSchema } from "@/lib/schemas/agent";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type RouteContext = { params: Promise<{ profileId: string }> };

export async function GET(
  _request: NextRequest,
  context: RouteContext,
) {
  const { profileId } = await context.params;
  const res = await fetch(`${API_BASE}/api/agents/${profileId}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    return NextResponse.json(
      { error: "Failed to fetch agent" },
      { status: res.status },
    );
  }
  const data = await res.json();
  return NextResponse.json(data);
}

export async function PUT(
  request: NextRequest,
  context: RouteContext,
) {
  const { profileId } = await context.params;
  const body = await request.json();
  const parsed = agentProfileDraftSchema.parse(body);
  const res = await fetch(`${API_BASE}/api/agents/${profileId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(parsed),
  });

  if (!res.ok) {
    return NextResponse.json(
      { error: "Failed to update agent" },
      { status: res.status },
    );
  }
  const data = await res.json();
  return NextResponse.json(data);
}

export async function DELETE(
  _request: NextRequest,
  context: RouteContext,
) {
  const { profileId } = await context.params;
  const res = await fetch(`${API_BASE}/api/agents/${profileId}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    return NextResponse.json(
      { error: "Failed to delete agent" },
      { status: res.status },
    );
  }
  return NextResponse.json({ success: true });
}


