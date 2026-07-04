"use client";

// Organization context for the chat workspace.
//
// Holds the list of orgs the current user belongs to plus the currently
// selected one, and persists that choice in localStorage so a refresh keeps the
// user in the same org "circle". The selected org id is the single source of
// truth that scopes chat data (conversations, profiles, presence) — screens read
// `currentOrg` via useOrg() and thread its id into the data layer.
//
// Kept separate from the ME identity singleton: identity is *who you are*, the
// org context is *which workspace you're in*.

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { listMyOrganizations } from "@/lib/supabase/chat_orgs";

const LS_KEY = "geiger-chat-org-id";

const OrgContext = createContext(null);

function readStoredOrgId() {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(LS_KEY) || null;
  } catch {
    return null;
  }
}

function writeStoredOrgId(id) {
  if (typeof window === "undefined") return;
  try {
    if (id) window.localStorage.setItem(LS_KEY, id);
    else window.localStorage.removeItem(LS_KEY);
  } catch {
    /* ignore */
  }
}

// Active org handed off via the URL (?org=<id>). geiger-dash carries the current
// org in its own route (/org/{id}); when it deep-links into the proxied chat
// (/chat/home?org=<id>) this lets the workspace open directly on that org.
function readOrgParam() {
  if (typeof window === "undefined") return null;
  try {
    return new URLSearchParams(window.location.search).get("org") || null;
  } catch {
    return null;
  }
}

export function OrgProvider({ children }) {
  const [orgs, setOrgs] = useState([]);
  const [currentOrg, setCurrentOrg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load the user's orgs once on mount, then restore the last-used selection.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const list = await listMyOrganizations();
      if (cancelled) return;
      if (!list) {
        // null = not configured or read failed. Leave the workspace empty and
        // let the auth gate / empty state handle it.
        setOrgs([]);
        setCurrentOrg(null);
        setLoading(false);
        return;
      }
      setOrgs(list);

      // Preference order: explicit ?org= deep-link, then the last-used org, then
      // the first org the user belongs to. Only ids the user is actually a member
      // of (list is RLS-scoped) are honored.
      const paramId = readOrgParam();
      const storedId = readStoredOrgId();
      const chosen =
        (paramId && list.find((o) => o.id === paramId)) ||
        (storedId && list.find((o) => o.id === storedId)) ||
        list[0] ||
        null;
      setCurrentOrg(chosen);
      if (chosen?.id && chosen.id !== storedId) writeStoredOrgId(chosen.id);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Switch org: update state + persist. Callers (ChatScreen) react to the id
  // change and refetch scoped data.
  const selectOrg = useCallback((orgId) => {
    const next = orgs.find((o) => o.id === orgId) || null;
    if (!next) return;
    setCurrentOrg(next);
    writeStoredOrgId(next.id);
  }, [orgs]);

  const value = useMemo(
    () => ({ orgs, currentOrg, currentOrgId: currentOrg?.id ?? null, selectOrg, loading, error }),
    [orgs, currentOrg, selectOrg, loading, error],
  );

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>;
}

export function useOrg() {
  const ctx = useContext(OrgContext);
  if (!ctx) {
    // Used outside a provider — return a safe no-op shape rather than throwing,
    // so components that render in both provider and non-provider trees degrade
    // gracefully (e.g. the landing playground never mounts the provider).
    return { orgs: [], currentOrg: null, currentOrgId: null, selectOrg: () => {}, loading: false, error: null };
  }
  return ctx;
}
