import type {
  GenerateSuggestionsRequest,
  GenerateSuggestionsResponse,
  SubmitFeedbackRequest,
} from "@holiday-planner/shared-types";

const FASTAPI_URL = process.env.FASTAPI_URL ?? "http://localhost:8000";
const FASTAPI_SECRET = process.env.FASTAPI_SECRET ?? "";

async function fetchFromAI<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${FASTAPI_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-FastAPI-Secret": FASTAPI_SECRET,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`FastAPI error ${res.status}: ${error}`);
  }

  return res.json();
}

export const aiApi = {
  generateSuggestions: (req: GenerateSuggestionsRequest) =>
    fetchFromAI<GenerateSuggestionsResponse>("/suggestions/generate", {
      method: "POST",
      body: JSON.stringify(req),
    }),

  getSuggestions: (tripId: string) =>
    fetchFromAI<{ trip_id: string; suggestions: unknown[] }>(
      `/suggestions/${tripId}`
    ),

  submitFeedback: (req: SubmitFeedbackRequest, userId: string) =>
    fetchFromAI<{ status: string }>("/feedback/", {
      method: "POST",
      body: JSON.stringify(req),
      headers: { "X-User-Id": userId },
    }),

  getHolidays: (countryCode: string, year: number) =>
    fetchFromAI<{ holidays: unknown[] }>(`/holidays/${countryCode}/${year}`),
};
