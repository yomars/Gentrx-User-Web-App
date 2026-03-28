import { removeStorageItem } from "../lib/storage";

const logoutFn = () => {
  removeStorageItem("user");
  window.location.href = "/";
  window.location.reload();
};

export default logoutFn;
