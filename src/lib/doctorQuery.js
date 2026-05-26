import { GET } from "../Controllers/ApiControllers";
import { getStorageJSON, setStorageItem } from "./storage";

const RESOLVED_CLINIC_STORAGE_KEY = "resolvedClinic";

const isTimeoutError = (error) => {
  if (!error) return false;

  const code = String(error?.code || "").toUpperCase();
  const message = String(error?.message || "").toLowerCase();

  return (
    code === "ECONNABORTED" ||
    message.includes("timeout") ||
    message.includes("timed out")
  );
};

const toFiniteNumber = (value) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const resolveClinic = async ({ selectedCity } = {}) => {
  const user = getStorageJSON("user") || {};
  const patientCode = String(user?.patient_code || "").trim();

  const latitude = toFiniteNumber(selectedCity?.latitude);
  const longitude = toFiniteNumber(selectedCity?.longitude);

  const params = new URLSearchParams();
  params.set("guest", patientCode ? "0" : "1");

  if (patientCode) {
    params.set("patient_code", patientCode);
  }

  if (latitude !== null && longitude !== null) {
    params.set("latitude", String(latitude));
    params.set("longitude", String(longitude));
  }

  if (selectedCity?.id !== undefined && selectedCity?.id !== null) {
    params.set("city_id", String(selectedCity.id));
  }

  try {
    const response = await GET(`resolve_clinic?${params.toString()}`);
    const resolved = response?.data;

    if (resolved?.clinic_id) {
      setStorageItem(RESOLVED_CLINIC_STORAGE_KEY, JSON.stringify(resolved));
      return resolved;
    }
  } catch (error) {
    if (!isTimeoutError(error)) {
      console.error("resolve_clinic failed", error);
    }
  }

  const cached = getStorageJSON(RESOLVED_CLINIC_STORAGE_KEY);
  return cached?.clinic_id ? cached : null;
};

export const buildDoctorEndpoint = async ({
  selectedCity,
  department,
  search,
} = {}) => {
  const resolved = await resolveClinic({ selectedCity });

  const params = new URLSearchParams();
  params.set("active", "1");

  if (resolved?.clinic_id) {
    params.set("clinic_id", String(resolved.clinic_id));
  } else if (selectedCity?.id) {
    params.set("city_id", String(selectedCity.id));
  }

  if (department !== undefined && department !== null && department !== "") {
    params.set("department", String(department));
  }

  if (search !== undefined) {
    params.set("search", String(search ?? ""));
  }

  return `get_doctor?${params.toString()}`;
};

const buildDoctorEndpointFromParams = ({ clinicId, cityId, department, search }) => {
  const params = new URLSearchParams();
  params.set("active", "1");

  if (clinicId !== undefined && clinicId !== null && clinicId !== "") {
    params.set("clinic_id", String(clinicId));
  } else if (cityId !== undefined && cityId !== null && cityId !== "") {
    params.set("city_id", String(cityId));
  }

  if (department !== undefined && department !== null && department !== "") {
    params.set("department", String(department));
  }

  if (search !== undefined) {
    params.set("search", String(search ?? ""));
  }

  return `get_doctor?${params.toString()}`;
};

export const buildDoctorEndpointCandidates = async ({
  selectedCity,
  department,
  search,
} = {}) => {
  const resolved = await resolveClinic({ selectedCity });
  const clinicId = resolved?.clinic_id;
  const cityId = selectedCity?.id;

  const candidates = [
    buildDoctorEndpointFromParams({ clinicId, cityId, department, search }),
  ];

  if (clinicId && cityId) {
    candidates.push(
      buildDoctorEndpointFromParams({
        clinicId: null,
        cityId,
        department,
        search,
      })
    );
  }

  candidates.push(
    buildDoctorEndpointFromParams({
      clinicId: null,
      cityId: null,
      department,
      search,
    })
  );

  return Array.from(new Set(candidates));
};

export const fetchDoctorsWithFallback = async ({
  selectedCity,
  department,
  search,
  limit,
} = {}) => {
  const endpoints = await buildDoctorEndpointCandidates({
    selectedCity,
    department,
    search,
  });

  let lastError;

  for (let index = 0; index < endpoints.length; index += 1) {
    const endpoint = endpoints[index];
    const hasNextFallback = index < endpoints.length - 1;

    try {
      const response = await GET(endpoint);
      const rows = Array.isArray(response?.data) ? response.data : [];

      if (limit && rows.length > limit) {
        return rows.slice(0, limit);
      }

      return rows;
    } catch (error) {
      lastError = error;

      if (!hasNextFallback || !isTimeoutError(error)) {
        throw error;
      }
    }
  }

  throw lastError || new Error("Failed to fetch doctors");
};
