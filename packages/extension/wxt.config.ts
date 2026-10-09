import { defineConfig } from "wxt";

// https://wxt.dev/api/config.html
export default defineConfig({
  // MV3 everywhere: Firefox needs it for MAIN-world content scripts and declarativeNetRequest.
  manifestVersion: 3,
  manifest: {
    name: "human.txt",
    description: "Keep your human.txt in your browser and share the right layer with the right site.",
    homepage_url: "https://humantxt.org",
    permissions: ["storage", "declarativeNetRequest"],
    // Needed to add the Human-Txt announcement header and to offer navigator.humanTxt on every site.
    host_permissions: ["<all_urls>"],
    // Adds `Human-Txt: v=0.1` to requests. It carries no ID and no preferences (spec §6.1).
    declarative_net_request: {
      rule_resources: [{ id: "announce", enabled: true, path: "rules.json" }],
    },
    browser_specific_settings: {
      gecko: { id: "extension@humantxt.org", strict_min_version: "128.0" },
    },
  },
});
