import { createRoot } from "react-dom/client";
import { createElement, StrictMode } from "react";
import "../../../packages/renderer-react/src/theme/tokens.css";
import { App } from "./App.js";

const container = document.getElementById("root");
if (!container) {
  throw new Error("Root container not found");
}
createRoot(container).render(createElement(StrictMode, null, createElement(App, null)));
