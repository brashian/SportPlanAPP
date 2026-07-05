import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";
import type { AuthUser } from "./types/models";

// ----------------------------------------------------------------------------
// Usuario simulado para poder visualizar la app sin backend/login todavía.
// Cambiá "role" a "athlete" para ver la vista del Atleta (y probá también
// cambiar el "id" a "athlete-2" para ver el perfil de Bruno).
// ----------------------------------------------------------------------------
const mockCurrentUser: AuthUser = {
  id: "coach-1",
  role: "coach", // probar también: "athlete"
  name: "Coach Demo",
};

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App currentUser={mockCurrentUser} />
    </BrowserRouter>
  </React.StrictMode>
);
