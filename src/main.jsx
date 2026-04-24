import { ChakraProvider } from "@chakra-ui/react";
import "@smastrom/react-rating/style.css";
import React, { startTransition } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "swiper/swiper-bundle.css";
import { notifyManager } from "@tanstack/react-query";
import theme from "./../theme";
import App from "./App.jsx";
import "./index.css";
import { getStorageItem, setStorageItem } from "./lib/storage";

// Use React 18 startTransition as TanStack Query's scheduler so that
// query-driven re-renders are deferred as low-priority work and do not
// block the main thread (prevents "setTimeout handler took Xms" violations).
notifyManager.setScheduler(startTransition);

// Override local storage color mode setting to light
if (getStorageItem("chakra-ui-color-mode") === "dark") {
  setStorageItem("chakra-ui-color-mode", "light");
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ChakraProvider theme={theme}>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        {" "}
        <App />
      </BrowserRouter>
    </ChakraProvider>
  </React.StrictMode>
);
