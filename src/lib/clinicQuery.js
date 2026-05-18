export const buildClinicEndpoint = ({ selectedCity, limit } = {}) => {
  const params = new URLSearchParams();

  const cityId = selectedCity?.id;
  if (cityId !== undefined && cityId !== null && String(cityId).trim() !== "") {
    params.set("city_id", String(cityId));
  }

  if (limit !== undefined && limit !== null) {
    const numericLimit = Number(limit);
    if (Number.isFinite(numericLimit) && numericLimit > 0) {
      params.set("limit", String(Math.floor(numericLimit)));
    }
  }

  const query = params.toString();
  return query ? `patient/clinics?${query}` : "patient/clinics";
};
