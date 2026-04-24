import { GET_AUTH } from "./ApiControllers";
import user from "./user";
import { setStorageItem } from "../lib/storage";

export const updateUserLocalStorage = async () => {
  try {
    const res = await GET_AUTH(user.token, "patient/me");

    if (res.status === true && res.data) {
      // Update localStorage with refreshed user data
      const updatedUser = { ...res.data, token: user.token };
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

