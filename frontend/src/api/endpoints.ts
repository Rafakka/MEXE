

const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";

export const ENDPOINTS = {

    HEALTH: `${API_BASE}/health`,

    READY: `${API_BASE}/ready`,

    BLEND: `${API_BASE}/blend`,

} as const;
