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
