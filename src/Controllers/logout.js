const logoutFn = () => {
  localStorage.removeItem("user");
  window.location.href = "/";
  window.location.reload();
};

export default logoutFn;
