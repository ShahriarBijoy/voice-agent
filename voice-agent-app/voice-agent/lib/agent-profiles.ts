"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQueryState, parseAsString } from "nuqs";
import {
  AgentProfile,
  AgentProfileDraft,
  agentProfileDraftSchema,
} from "@/lib/schemas/agent";

interface AgentProfilesResponse {
  data: AgentProfile[];
}

interface AgentProfileResponse {
  data: AgentProfile;
}


export function useAgentProfiles() {
  const [profiles, setProfiles] = useState<AgentProfile[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProfiles = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/agents");
      if (!res.ok) {
        throw new Error(`Failed to fetch agents (${res.status})`);
      }
      const payload = (await res.json()) as AgentProfilesResponse;
      setProfiles(payload.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  return useMemo(
    () => ({ profiles, isLoading, error, refetch: fetchProfiles }),
    [profiles, isLoading, error, fetchProfiles],
  );
}

export function useAgentProfile(profileId?: string) {
  const [profile, setProfile] = useState<AgentProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profileId) {
      setProfile(null);
      return;
    }

    let isMounted = true;
    const fetchProfile = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/agents/${profileId}`);
        if (!res.ok) {
          throw new Error(`Failed to fetch agent (${res.status})`);
        }
        const payload = (await res.json()) as AgentProfileResponse;
        if (isMounted) {
          setProfile(payload.data);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Unknown error");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchProfile();

    return () => {
      isMounted = false;
    };
  }, [profileId]);

  return useMemo(
    () => ({ profile, isLoading, error }),
    [profile, isLoading, error],
  );
}

export async function createAgentProfile(payload: AgentProfileDraft) {
  // Remove timestamps - backend will generate them
  const { createdAt, updatedAt, ...payloadWithoutTimestamps } = payload;
  const parsed = agentProfileDraftSchema.parse(payloadWithoutTimestamps);
  const res = await fetch("/api/agents", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(parsed),
  });

  if (!res.ok) {
    throw new Error(`Failed to create agent (${res.status})`);
  }
  const data = (await res.json()) as AgentProfileResponse;
  return data.data;
}

export async function updateAgentProfile(
  profileId: string,
  payload: AgentProfileDraft,
) {
  // Remove timestamps - backend will generate them
  const { createdAt, updatedAt, ...payloadWithoutTimestamps } = payload;
  const parsed = agentProfileDraftSchema.parse(payloadWithoutTimestamps);
  const res = await fetch(`/api/agents/${profileId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(parsed),
  });

  if (!res.ok) {
    throw new Error(`Failed to update agent (${res.status})`);
  }
  const data = (await res.json()) as AgentProfileResponse;
  return data.data;
}

export async function deleteAgentProfile(profileId: string) {
  const res = await fetch(`/api/agents/${profileId}`, {
    method: "DELETE",
  });

  if (!res.ok) {
    throw new Error(`Failed to delete agent (${res.status})`);
  }
}

export function useAgentBuilderState() {
  const [profileId, setProfileId] = useQueryState("profileId", parseAsString);
  return [{ profileId }, (updates: { profileId?: string | null }) => {
    if (updates.profileId !== undefined) {
      setProfileId(updates.profileId);
    }
  }] as const;
}


