import { GET } from "../Controllers/ApiControllers";
import { getStorageJSON, setStorageItem } from "./storage";

const RESOLVED_CLINIC_STORAGE_KEY = "resolvedClinic";

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

  try {
    const response = await GET(`resolve_clinic?${params.toString()}`);
    const resolved = response?.data;

    if (resolved?.clinic_id) {
      setStorageItem(RESOLVED_CLINIC_STORAGE_KEY, JSON.stringify(resolved));
      return resolved;
    }
  } catch (error) {
    console.error("resolve_clinic failed", error);
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
