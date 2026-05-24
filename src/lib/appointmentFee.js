const DEFAULT_PIPE_FEE = 20;

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const pickFirstNumeric = (...values) => {
  for (const value of values) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return 0;
};

const normalizeType = (type) => String(type || "").trim().toLowerCase();

export const isOpdOrVideoType = (type) => {
  const normalized = normalizeType(type);
  return normalized === "opd" || normalized === "video consultant" || normalized === "video call";
};

export const getPipeFeeFromSettings = (settingsData, fallback = DEFAULT_PIPE_FEE) => {
  if (!Array.isArray(settingsData)) {
    return fallback;
  }

  const pipeFeeSetting = settingsData.find((value) => value?.id_name === "pipe_fee");
  if (!pipeFeeSetting) {
    return fallback;
  }

  const parsedPipeFee = Number(pipeFeeSetting.value);
  return Number.isFinite(parsedPipeFee) ? parsedPipeFee : fallback;
};

export const getDoctorFeeForAppointment = (type, doctor) => {
  const feeSource = doctor || {};
  const normalized = normalizeType(type);

  if (normalized === "emergency") {
    return toNumber(feeSource.emg_fee);
  }

  if (normalized === "opd" || normalized === "video consultant" || normalized === "video call") {
    return toNumber(feeSource.opd_fee);
  }

  return toNumber(feeSource.opd_fee);
};

export const getClinicFeeForAppointment = (doctor, clinic) => {
  return pickFirstNumeric(
    doctor?.clinic_fee,
    doctor?.fee,
    doctor?.clinicFee,
    doctor?.clinic?.clinic_fee,
    doctor?.clinic?.fee,
    clinic?.clinic_fee,
    clinic?.fee
  );
};

export const getAppointmentFeeBreakdown = (type, doctor, settingsData, clinic) => {
  const doctorFee = getDoctorFeeForAppointment(type, doctor);

  if (!isOpdOrVideoType(type)) {
    return {
      doctorFee,
      clinicFee: 0,
      pipeFee: 0,
      feeAmount: doctorFee,
    };
  }

  const clinicFee = getClinicFeeForAppointment(doctor, clinic);
  const pipeFee = getPipeFeeFromSettings(settingsData);

  return {
    doctorFee,
    clinicFee,
    pipeFee,
    feeAmount: doctorFee + clinicFee + pipeFee,
  };
};
