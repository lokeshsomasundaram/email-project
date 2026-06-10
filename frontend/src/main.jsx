import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { Provider } from "react-redux";
import { store } from "./store/store.js";
import { TimezoneProvider } from './context/TimezoneContext';

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Provider store={store}>
      <TimezoneProvider>
      <App />
      </TimezoneProvider>
    </Provider>
  </React.StrictMode>,
);
