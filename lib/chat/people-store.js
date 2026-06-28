"use client";

// Synchronous, in-memory people directory hydrated from the DB so chat
// components can resolve a person by id during render. This replaces the old
// mock getPerson/ME: screens fetch profiles, call hydratePeople()/setMe(), then
// every component reads people from here.

const _people = {};

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
