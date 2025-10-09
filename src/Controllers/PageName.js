import { useLocation } from "react-router-dom";

const PageName = () => {
  const Uselocation = useLocation();
  const location = Uselocation.pathname.split("/")[1];
  return location ? location.charAt(0).toUpperCase() + location.slice(1) : "";
};

export default PageName;
