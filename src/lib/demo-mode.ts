const demoModeSetting = import.meta.env["VITE_DEMO_MODE"];

export const isDemoMode = demoModeSetting === "true" || demoModeSetting === undefined;
