import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildDoctorEndpoint } from "../doctorQuery";
import { GET } from "../../Controllers/ApiControllers";

// Mock API layer so resolveClinic never makes real HTTP calls
vi.mock("../../Controllers/ApiControllers", () => ({
  GET: vi.fn(),
}));

// Mock storage so resolveClinic finds no cached clinic
vi.mock("../storage", () => ({
  getStorageJSON: vi.fn().mockReturnValue(null),
  setStorageItem: vi.fn(),
}));

describe("buildDoctorEndpoint — City → Clinic filtering", () => {
  beforeEach(() => {
    // Reset call history AND queued once-implementations between tests
    vi.resetAllMocks();
    // Restore default: GET returns no clinic from resolve_clinic
    GET.mockResolvedValue({ data: null });
  });

  it("uses clinic_id = city.id when a city is selected", async () => {
    const city = { id: 3, city: "Cebu", latitude: 10.3, longitude: 123.9 };
    const endpoint = await buildDoctorEndpoint({ selectedCity: city });
    const params = new URLSearchParams(endpoint.split("?")[1]);

    expect(params.get("clinic_id")).toBe("3");
    expect(params.get("city_id")).toBe("3");
  });

  it("filters are strictly from city.id — resolve_clinic is NOT called when city is set", async () => {
    // Even if resolve_clinic would return a different clinic, city.id must win
    const city = { id: 5, city: "Manila", latitude: 14.6, longitude: 120.9 };
    const endpoint = await buildDoctorEndpoint({ selectedCity: city });
    const params = new URLSearchParams(endpoint.split("?")[1]);

    // GET (resolve_clinic) must NOT be called when a city is selected
    expect(GET).not.toHaveBeenCalled();
    expect(params.get("clinic_id")).toBe("5");
    expect(params.get("city_id")).toBe("5");
  });

  it("falls back to resolve_clinic when no city is selected", async () => {
    GET.mockResolvedValueOnce({ data: { clinic_id: 7 } });

    const endpoint = await buildDoctorEndpoint({ selectedCity: null });
    const params = new URLSearchParams(endpoint.split("?")[1]);

    expect(GET).toHaveBeenCalledOnce();
    expect(params.get("clinic_id")).toBe("7");
    expect(params.has("city_id")).toBe(false);
  });

  it("returns no clinic_id or city_id when city is null and resolve_clinic fails", async () => {
    // Default mock returns { data: null } so no clinic is resolved
    const endpoint = await buildDoctorEndpoint({ selectedCity: null });
    const params = new URLSearchParams(endpoint.split("?")[1]);

    expect(params.has("clinic_id")).toBe(false);
    expect(params.has("city_id")).toBe(false);
    expect(params.get("active")).toBe("1");
  });

  it("includes department param when provided alongside a city", async () => {
    const city = { id: 2, city: "Davao" };
    const endpoint = await buildDoctorEndpoint({
      selectedCity: city,
      department: 11,
    });
    const params = new URLSearchParams(endpoint.split("?")[1]);

    expect(params.get("clinic_id")).toBe("2");
    expect(params.get("department")).toBe("11");
  });

  it("includes search param when provided", async () => {
    const city = { id: 2, city: "Davao" };
    const endpoint = await buildDoctorEndpoint({
      selectedCity: city,
      search: "cardio",
    });
    const params = new URLSearchParams(endpoint.split("?")[1]);

    expect(params.get("search")).toBe("cardio");
  });

  it("always sets active=1", async () => {
    const endpoint = await buildDoctorEndpoint({});
    const params = new URLSearchParams(endpoint.split("?")[1]);
    expect(params.get("active")).toBe("1");
  });
});
