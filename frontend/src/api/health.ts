import { get } from "../api/http";
import { ENDPOINTS } from "../api/endpoints";

export async function health() {
    return get(ENDPOINTS.HEALTH);
}
