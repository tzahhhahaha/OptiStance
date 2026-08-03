
  import { createRoot } from "react-dom/client";
  import App from "./app/App.tsx";
  import "./styles/index.css";

  // Debug: print Vite env (module context) to verify Firebase vars
  // Note: `import.meta` only works inside ES modules — don't run this in the Console directly.
  // Remove or comment out after verifying values.
  // eslint-disable-next-line no-console
  console.log('VITE_FIREBASE_API_KEY=', import.meta.env.VITE_FIREBASE_API_KEY);

  createRoot(document.getElementById("root")!).render(<App />);
  