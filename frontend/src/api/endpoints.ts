

const API_BASE = "/api";

export const ENDPOINTS = {

    HEALTH: `${API_BASE}/health`,

    READY: `${API_BASE}/ready`,

    BLEND: `${API_BASE}/blend`,

} as const;
