/* eslint-disable react-refresh/only-export-components */
import { createContext, useState, useContext } from "react";
import PropTypes from "prop-types";
import currentCity from "../Controllers/currentCity";

// Create the context for selectedCity
const CityContext = createContext();

// Provider component to wrap around the app
export const CityProvider = ({ children }) => {
  const [selectedCity, setSelectedCity] = useState(currentCity);

  return (
    <CityContext.Provider value={{ selectedCity, setSelectedCity }}>
      {children}
    </CityContext.Provider>
  );
};

CityProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

//Custom hook to use the selectedCity context
export const useCity = () => {
  return useContext(CityContext);
};
