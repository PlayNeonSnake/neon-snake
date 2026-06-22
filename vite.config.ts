import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    strictPort: true,
    // Vite 6 blocks hosts not in this allowlist (CSRF protection). The
    // playground serves previews via Fly's proxy at <app>.fly.dev with a
    // routing header, so we allow .fly.dev plus the gitlawb published
    // domain. Localhost stays allowed for local dev runs of the template.
    allowedHosts: [
      "localhost",
      "127.0.0.1",
      ".fly.dev",
      ".gitlawb.app",
    ],
  },
});
