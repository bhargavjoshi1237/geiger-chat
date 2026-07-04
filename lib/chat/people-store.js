"use client";

// Synchronous, in-memory people directory hydrated from the DB so chat
// components can resolve a person by id during render. This replaces the old
// mock getPerson/ME: screens fetch profiles, call hydratePeople()/setMe(), then
// every component reads people from here.

const _people = {};

// The org the viewer is currently in. Set by the chat screen on load so any
// component can tell whether a person belongs to this org or is "external".
let _currentOrgId = null;

// The authoritative roster of the current org: the set of user ids that are
// members of it (from public.organization_users). This is the source of truth
// for "external", NOT a person's `organizationId` — that column only records a
// person's *last-active* org, so a member of this org who is currently active in
// another org would otherwise be mis-flagged as external. `null` = not loaded.
let _orgMemberIds = null;

export function setCurrentOrgId(id) {
  const next = id || null;
  // The roster is per-org; invalidate it when the org changes so we don't judge
  // membership against the previous org's roster during the switch.
  if (next !== _currentOrgId) _orgMemberIds = null;
  _currentOrgId = next;
}

// Record the current org's member ids (from listOrgMembers). Called by the chat
// screen once the roster loads.
export function setOrgMemberIds(ids) {
  _orgMemberIds = new Set((ids || []).filter(Boolean));
}

// True when a person isn't a member of the current org — i.e. an external
// contact. Membership is decided by the org roster (a person can belong to many
// orgs); we only fall back to their last-active `organizationId` while the
// roster is still loading. Returns false when we don't know the org yet, or for
// "me".
export function isExternalPerson(person) {
  if (!person || !_currentOrgId) return false;
  if (ME.id && person.id === ME.id) return false;
  // Authoritative: are they on the current org's roster?
  if (_orgMemberIds) return !_orgMemberIds.has(person.id);
  // Roster not loaded yet — best-effort fall back to their last-active org.
  return !!person.organizationId && person.organizationId !== _currentOrgId;
}

// "Me". A mutable object (stable reference) so any module that imported the ME
// binding sees the values fill in after setMe() runs.
export const ME = {
  id: null,
  name: "You",
  firstName: "You",
  role: "",
  color: "#6366f1",
  presence: "online",
};

export function hydratePeople(list = []) {
  for (const p of list) if (p?.id) _people[p.id] = p;
}

// Ensure the given person ids are resolvable by getPerson(). Any id not already
// in the store (and not "me") is fetched by id — NOT org-scoped — so authors /
// members who aren't in the current org's directory still render with a real
// name instead of "Unknown". Returns the freshly hydrated profiles (empty when
// nothing was missing), so the caller can trigger a re-render.
export async function ensurePeople(ids = []) {
  const missing = [...new Set((ids || []).filter((id) => id && id !== ME.id && !_people[id]))];
  if (missing.length === 0) return [];
  // Imported lazily to avoid a static cycle (chat_profiles imports nothing from
  // this store, but keep the dependency one-directional and explicit).
  const { getProfilesByIds } = await import("@/lib/supabase/chat_profiles");
  const fetched = await getProfilesByIds(missing);
  hydratePeople(fetched);
  return fetched;
}

export function setMe(profile) {
  if (!profile) return;
  Object.assign(ME, profile);
  if (ME.id) _people[ME.id] = { ...ME };
}

export function getPerson(id) {
  if (id && _people[id]) return _people[id];
  if (id && ME.id === id) return ME;
  return {
    id,
    name: "Unknown",
    firstName: "Unknown",
    role: "",
    color: "#737373",
    presence: "offline",
  };
}

export function allPeople() {
  return Object.values(_people);
}
