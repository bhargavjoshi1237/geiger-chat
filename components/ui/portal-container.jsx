"use client";

import * as React from "react";

// Lets a subtree (e.g. the landing playground) redirect Radix portals — dialogs
// and sheets — into a local element instead of document.body, so overlays stay
// contained within that frame. When no provider is present the value is null and
// the primitives fall back to their default (body) portal target.
const PortalContainerContext = React.createContext(null);

export function PortalContainerProvider({ container, children }) {
  return (
    <PortalContainerContext.Provider value={container}>
      {children}
    </PortalContainerContext.Provider>
  );
}

export function usePortalContainer() {
  return React.useContext(PortalContainerContext);
}
