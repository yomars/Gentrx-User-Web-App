export const VITALS_QUERY_KEY = ["vitals"];

export const VITAL_TYPES = {
  BLOOD_PRESSURE: "Blood Pressure",
  SUGAR: "Sugar",
  WEIGHT: "Weight",
  TEMPERATURE: "Temperature",
  SPO2: "SpO2",
};

const normalizePositiveInteger = (value) => {
  const normalizedValue = normalizeValue(value);
  if (!normalizedValue) {
    return "";
  }

  const parsedValue = Number(normalizedValue);
  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    return "";
  }

  return String(parsedValue);
};

const resolveFamilyMemberIdCandidate = (candidate) => {
  if (!candidate || typeof candidate !== "object") {
    return "";
  }

  return normalizePositiveInteger(
    candidate.family_member_id ||
      candidate.familyMemberId ||
      candidate.member_id ||
      candidate.memberId ||
      candidate.id ||
      candidate.data?.family_member_id ||
      candidate.data?.familyMemberId ||
      candidate.data?.member_id ||
      candidate.data?.memberId ||
      candidate.data?.id ||
      ""
  );
};

export const buildVitalsByMemberTypeEndpoint = (
  familyMemberId,
  type,
  startDate,
  endDate,
  currentUser
) => {
  const params = new URLSearchParams({ type, start_date: startDate, end_date: endDate });

  const normalizedFamilyMemberId =
    normalizePositiveInteger(familyMemberId) || resolveFamilyMemberIdCandidate(currentUser);

  if (normalizedFamilyMemberId) {
    params.set("family_member_id", normalizedFamilyMemberId);
  }

  const patientCode = resolvePatientCode(currentUser);
  if (patientCode) {
    params.set("patient_code", patientCode);
    params.set("owner_id", patientCode);
    params.set("owner_type", "patient");
  }

  if (!normalizedFamilyMemberId && !patientCode) {
    throw new Error("Unable to load vitals: missing patient identity. Please sign in again.");
  }

  return `get_vitals_family_member_id_type?${params.toString()}`;
};

export const invalidateVitalsQueries = (queryClient) =>
  queryClient.invalidateQueries({ queryKey: VITALS_QUERY_KEY });

export const resolveVitalsMemberId = (selectedMember, currentUser) => {
  return (
    resolveFamilyMemberIdCandidate(selectedMember) ||
    resolveFamilyMemberIdCandidate(currentUser) ||
    null
  );
};

const normalizeValue = (value) => {
  if (value === undefined || value === null) return "";
  return String(value).trim();
};

export const resolvePatientCode = (currentUser) => {
  return (
    normalizeValue(currentUser?.patient_code) ||
    normalizeValue(currentUser?.code) ||
    normalizeValue(currentUser?.patientCode) ||
    ""
  );
};

export const buildVitalsMutationPayload = ({
  data,
  selectedMember,
  currentUser,
  type,
  recordId,
}) => {
  const payload = {
    ...(data || {}),
    type,
  };

  if (recordId !== undefined && recordId !== null) {
    payload.id = recordId;
  }

  const memberId = resolveVitalsMemberId(selectedMember, currentUser);
  if (memberId) {
    payload.family_member_id = memberId;
  }

  if (currentUser?.id !== undefined && currentUser?.id !== null) {
    payload.user_id = currentUser.id;
  }

  const patientCode =
    resolvePatientCode(currentUser) || normalizeValue(selectedMember?.patient_code);
  if (patientCode) {
    payload.patient_code = patientCode;
    payload.owner_id = patientCode;
    payload.owner_type = "patient";
  }

  return payload;
};
