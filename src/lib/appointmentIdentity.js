const toBooleanFlag = (value, defaultValue = true) => {
  if (typeof value !== "string") return defaultValue;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return defaultValue;
  return !(normalized === "0" || normalized === "false" || normalized === "off" || normalized === "no");
};

const COUNTER_KEY = "appointment_legacy_fallback_hits";

export const USE_CANONICAL_APPOINTMENT_KEYS = toBooleanFlag(
  import.meta.env.VITE_USE_CANONICAL_APPOINTMENT_KEYS,
  true
);

const ENABLE_FALLBACK_LOGS = toBooleanFlag(
  import.meta.env.VITE_LOG_APPOINTMENT_FALLBACKS,
  true
);

const isIdentifierPresent = (value) => value !== undefined && value !== null && String(value).trim() !== "";

const readCounter = () => {
  if (typeof window === "undefined") return 0;
  try {
    const raw = window.sessionStorage?.getItem(COUNTER_KEY);
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : 0;
  } catch {
    return 0;
  }
};

const writeCounter = (value) => {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage?.setItem(COUNTER_KEY, String(value));
  } catch {
    // best effort only; storage can fail in strict privacy modes
  }
};

const warnFallback = (field, context, canonicalValue, legacyValue) => {
  const nextCount = readCounter() + 1;
  writeCounter(nextCount);

  if (!ENABLE_FALLBACK_LOGS) return;

  const label = context || "unknown";
  console.warn(
    `[migration-compat] Using legacy ${field} fallback in ${label}. fallbackHits=${nextCount}`,
    {
      canonicalValue,
      legacyValue,
    }
  );
};

const resolveIdentifier = ({
  canonicalValue,
  legacyValue,
  fallbackField,
  context,
}) => {
  if (USE_CANONICAL_APPOINTMENT_KEYS && isIdentifierPresent(canonicalValue)) {
    return canonicalValue;
  }

  if (isIdentifierPresent(legacyValue)) {
    warnFallback(fallbackField, context, canonicalValue, legacyValue);
    return legacyValue;
  }

  return isIdentifierPresent(canonicalValue) ? canonicalValue : null;
};

export const getDoctorIdentifier = (appointment, context) =>
  resolveIdentifier({
    canonicalValue: appointment?.doctor_id,
    legacyValue: appointment?.doct_id,
    fallbackField: "doct_id",
    context,
  });

export const getPatientIdentifier = (appointment, context) =>
  resolveIdentifier({
    canonicalValue: appointment?.patient_code,
    legacyValue: appointment?.patient_id,
    fallbackField: "patient_id",
    context,
  });

export const getLegacyFallbackHits = () => readCounter();

export const resetLegacyFallbackHits = () => writeCounter(0);

export const uniquePatients = (patients) => {
  if (!Array.isArray(patients)) return [];

  const seen = new Set();
  return patients.filter((patient) => {
    const key =
      patient?.patient_code || patient?.patient_id || patient?.id || `${patient?.f_name || ""}-${patient?.l_name || ""}-${patient?.phone || ""}`;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export const withAppointmentIdentifiers = (payload) => {
  if (!payload || typeof payload !== "object") return payload;

  const doctorId = payload.doctor_id ?? payload.doct_id ?? null;
  const patientCode = payload.patient_code ?? payload.patient_id ?? null;

  return {
    ...payload,
    doctor_id: doctorId,
    patient_code: patientCode,
    doct_id: payload.doct_id ?? doctorId,
    patient_id: payload.patient_id ?? patientCode,
  };
};