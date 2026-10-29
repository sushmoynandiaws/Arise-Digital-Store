import type { Catalog } from "./types";

export function readInitialCatalog(): Catalog | null {
  const element = document.getElementById("arise-catalog");
  if (element?.getAttribute("type") !== "application/json") return null;
  try {
    const value = JSON.parse(element.textContent || "");
    return value && Array.isArray(value.shops) && Array.isArray(value.products) ? value : null;
  } catch {
    return null;
  }
}
