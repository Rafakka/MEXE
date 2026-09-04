
import { get } from "../api/http";
import { ENDPOINTS } from "../api/endpoints";

export async function ready() {
    return get(ENDPOINTS.READY);
}
