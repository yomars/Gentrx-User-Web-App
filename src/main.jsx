import { ChakraProvider } from "@chakra-ui/react";
import "@smastrom/react-rating/style.css";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "swiper/swiper-bundle.css";
import theme from "./../theme";
import App from "./App.jsx";
import "./index.css";
import { getStorageItem, setStorageItem } from "./lib/storage";

// Override local storage color mode setting to light
if (getStorageItem("chakra-ui-color-mode") === "dark") {
  setStorageItem("chakra-ui-color-mode", "light");
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ChakraProvider theme={theme}>
      <BrowserRouter>
        {" "}
        <App />
      </BrowserRouter>
    </ChakraProvider>
  </React.StrictMode>
);
