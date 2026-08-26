export const MAURITANIA_WILAYAS = [
  "Adrar",
  "Assaba",
  "Brakna",
  "Dakhlet Nouadhibou",
  "Gorgol",
  "Guidimaka",
  "Hodh Ech Chargui",
  "Hodh El Gharbi",
  "Inchiri",
  "Nouakchott Nord",
  "Nouakchott Ouest",
  "Nouakchott Sud",
  "Tagant",
  "Tiris Zemmour",
  "Trarza",
] as const;

export type MauritaniaWilaya = (typeof MAURITANIA_WILAYAS)[number];

export type SearchCoordinates = {
  latitude: number;
  longitude: number;
};

export type SearchLocationContext = {
  coordinates: SearchCoordinates | null;
  wilaya: MauritaniaWilaya | null;
  promptDismissed: boolean;
};

const WILAYA_STORAGE_KEY = "lewad-search-wilaya-v1";
const COORDINATES_STORAGE_KEY = "lewad-search-coordinates-session-v1";
const PROMPT_DISMISSED_STORAGE_KEY = "lewad-search-location-prompt-dismissed-v1";

function isWilaya(value: unknown): value is MauritaniaWilaya {
  return typeof value === "string" && MAURITANIA_WILAYAS.includes(value as MauritaniaWilaya);
}

function isCoordinates(value: unknown): value is SearchCoordinates {
  if (!value || typeof value !== "object") return false;

  const coordinates = value as Record<string, unknown>;
  return (
    typeof coordinates.latitude === "number" &&
    Number.isFinite(coordinates.latitude) &&
    coordinates.latitude >= -90 &&
    coordinates.latitude <= 90 &&
    typeof coordinates.longitude === "number" &&
    Number.isFinite(coordinates.longitude) &&
    coordinates.longitude >= -180 &&
    coordinates.longitude <= 180
  );
}

function readCoordinates(): SearchCoordinates | null {
  try {
    const stored = sessionStorage.getItem(COORDINATES_STORAGE_KEY);
    if (!stored) return null;
    const parsed: unknown = JSON.parse(stored);
    return isCoordinates(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function readSearchLocationContext(): SearchLocationContext {
  try {
    const wilaya = localStorage.getItem(WILAYA_STORAGE_KEY);
    return {
      coordinates: readCoordinates(),
      wilaya: isWilaya(wilaya) ? wilaya : null,
      promptDismissed: localStorage.getItem(PROMPT_DISMISSED_STORAGE_KEY) === "1",
    };
  } catch {
    return { coordinates: null, wilaya: null, promptDismissed: false };
  }
}

export function saveSearchCoordinates(coordinates: SearchCoordinates) {
  try {
    sessionStorage.setItem(COORDINATES_STORAGE_KEY, JSON.stringify(coordinates));
    localStorage.removeItem(PROMPT_DISMISSED_STORAGE_KEY);
  } catch {
    /* The in-memory search context remains useful when storage is unavailable. */
  }
}

export function saveSearchWilaya(wilaya: MauritaniaWilaya | null) {
  try {
    if (wilaya) localStorage.setItem(WILAYA_STORAGE_KEY, wilaya);
    else localStorage.removeItem(WILAYA_STORAGE_KEY);
    localStorage.removeItem(PROMPT_DISMISSED_STORAGE_KEY);
  } catch {
    /* The in-memory search context remains useful when storage is unavailable. */
  }
}

export function dismissSearchLocationPrompt() {
  try {
    localStorage.setItem(PROMPT_DISMISSED_STORAGE_KEY, "1");
  } catch {
    /* A remount may show the prompt again when storage is unavailable. */
  }
}
