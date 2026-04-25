import { GET_AUTH } from "./ApiControllers";
import user from "./user";
import { setStorageItem } from "../lib/storage";

export const updateUserLocalStorage = async () => {
  try {
    const res = await GET_AUTH(user.token, "patient/me");

    if (res.status === true && res.data) {
      // Normalize wallet balance: new schema uses wallets.balance, old schema used wallet_amount.
      // Keep wallet_amount populated so legacy reads don't break while backend transitions.
      const data = res.data;
      if (data.balance !== undefined && data.wallet_amount === undefined) {
        data.wallet_amount = data.balance;
      }
      const updatedUser = { ...data, token: user.token };
      setStorageItem("user", JSON.stringify(updatedUser));
    } else {
      console.error(
        "Failed to refresh user data:",
        res.message || "Unknown error"
      );
    }
  } catch (error) {
    console.error("Error refreshing user data:", error.message);
  }
};

