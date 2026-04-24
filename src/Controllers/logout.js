import { getStorageJSON, removeStorageItem } from "../lib/storage";
import api from "./api";

const logoutFn = () => {
  // Fire-and-forget: invalidate token server-side; local logout always proceeds
  const user = getStorageJSON("user");
  if (user?.token) {
    fetch(`${api}/patient/logout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${user.token}` },
    }).catch(() => {});
  }
  removeStorageItem("user");
  window.location.href = "/";
};

export default logoutFn;
