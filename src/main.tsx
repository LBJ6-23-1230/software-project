import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";
const savedTheme = localStorage.getItem("campus-theme");
document.documentElement.dataset.theme =
  savedTheme === "dark" ? "dark" : "light";
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
