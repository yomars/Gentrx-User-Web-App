import { getStorageJSON, removeStorageItem, setStorageItem } from "./storage";

const PENDING_WALLET_TOPUP_KEY = "wallet_pending_topup";
const WALLET_TOPUP_RESULT_KEY = "wallet_topup_result";
const PENDING_APPOINTMENT_PAYMENT_KEY = "appointment_pending_payment";

const writeJSON = (key, value) => setStorageItem(key, JSON.stringify(value));

export const getPendingWalletTopup = () => getStorageJSON(PENDING_WALLET_TOPUP_KEY);

export const savePendingWalletTopup = (topup) =>
  writeJSON(PENDING_WALLET_TOPUP_KEY, {
    ...topup,
    createdAt: Date.now(),
  });

export const updatePendingWalletTopup = (patch) => {
  const currentTopup = getPendingWalletTopup();

  if (!currentTopup) {
    return false;
  }

  return writeJSON(PENDING_WALLET_TOPUP_KEY, {
    ...currentTopup,
    ...patch,
  });
};

export const clearPendingWalletTopup = () =>
  removeStorageItem(PENDING_WALLET_TOPUP_KEY);

export const saveWalletTopupResult = (result) =>
  writeJSON(WALLET_TOPUP_RESULT_KEY, {
    ...result,
    createdAt: Date.now(),
  });

export const consumeWalletTopupResult = () => {
  const result = getStorageJSON(WALLET_TOPUP_RESULT_KEY);

  if (result) {
    removeStorageItem(WALLET_TOPUP_RESULT_KEY);
  }

  return result;
};

export const getPendingAppointmentPayment = () =>
  getStorageJSON(PENDING_APPOINTMENT_PAYMENT_KEY);

export const savePendingAppointmentPayment = (appointmentPayment) =>
  writeJSON(PENDING_APPOINTMENT_PAYMENT_KEY, {
    ...appointmentPayment,
    createdAt: Date.now(),
  });

export const updatePendingAppointmentPayment = (patch) => {
  const currentPayment = getPendingAppointmentPayment();

  if (!currentPayment) {
    return false;
  }

  return writeJSON(PENDING_APPOINTMENT_PAYMENT_KEY, {
    ...currentPayment,
    ...patch,
  });
};

export const clearPendingAppointmentPayment = () =>
  removeStorageItem(PENDING_APPOINTMENT_PAYMENT_KEY);