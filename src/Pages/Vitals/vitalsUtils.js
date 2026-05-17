export const VITALS_QUERY_KEY = ["vitals"];

export const VITAL_TYPES = {
  BLOOD_PRESSURE: "Blood Pressure",
  SUGAR: "Sugar",
  WEIGHT: "Weight",
  TEMPERATURE: "Temperature",
  SPO2: "SpO2",
};

export const buildVitalsByMemberTypeEndpoint = (
  familyMemberId,
  type,
  startDate,
  endDate
) => {
  if (familyMemberId === undefined || familyMemberId === null || String(familyMemberId).trim() === "") {
    throw new Error("Unable to load vitals: missing member id. Please sign in again.");
  }

  const params = new URLSearchParams({
    family_member_id: String(familyMemberId),
    type,
    start_date: startDate,
    end_date: endDate,
  });

  return `get_vitals_family_member_id_type?${params.toString()}`;
};

export const invalidateVitalsQueries = (queryClient) =>
  queryClient.invalidateQueries({ queryKey: VITALS_QUERY_KEY });

export const resolveVitalsMemberId = (selectedMember, currentUser) => {
  return selectedMember?.id || currentUser?.id || null;
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
  if (!selectedMember?.isSelf && memberId) {
    payload.family_member_id = memberId;
  }

  if (currentUser?.id !== undefined && currentUser?.id !== null) {
    payload.user_id = currentUser.id;
  }

  const patientCode = resolvePatientCode(currentUser);
  if (patientCode) {
    payload.patient_code = patientCode;
    payload.owner_id = patientCode;
    payload.owner_type = "patient";
  }

  return payload;
};
