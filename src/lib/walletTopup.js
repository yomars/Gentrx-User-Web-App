import { getStorageJSON, removeStorageItem, setStorageItem } from "./storage";

const PENDING_WALLET_TOPUP_KEY = "wallet_pending_topup";
const WALLET_TOPUP_RESULT_KEY = "wallet_topup_result";

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