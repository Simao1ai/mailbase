import { createRoot } from "react-dom/client";
import { setApiKey } from "@workspace/api-client-react";
import App from "./App";
import "./index.css";

// Configure every API request to include the authentication key.
// This key is required by the API server for all /api/* routes.
setApiKey(import.meta.env.VITE_MAILBASE_API_KEY ?? null);

createRoot(document.getElementById("root")!).render(<App />);
