import { describe, expect, it } from "vitest";
import { buildClinicEndpoint } from "../clinicQuery";

describe("buildClinicEndpoint", () => {
  it("returns base clinics endpoint when no city is selected", () => {
    expect(buildClinicEndpoint()).toBe("patient/clinics");
  });

  it("includes city_id when selected city exists", () => {
    const endpoint = buildClinicEndpoint({ selectedCity: { id: 8 } });
    expect(endpoint).toBe("patient/clinics?city_id=8");
  });

  it("includes limit only when it is a positive number", () => {
    const endpoint = buildClinicEndpoint({ limit: 3 });
    expect(endpoint).toBe("patient/clinics?limit=3");
  });

  it("includes both city_id and limit together", () => {
    const endpoint = buildClinicEndpoint({
      selectedCity: { id: "15" },
      limit: 10,
    });
    expect(endpoint).toBe("patient/clinics?city_id=15&limit=10");
  });

  it("ignores invalid city ids and non-positive limits", () => {
    const endpoint = buildClinicEndpoint({
      selectedCity: { id: "" },
      limit: 0,
    });
    expect(endpoint).toBe("patient/clinics");
  });
});
