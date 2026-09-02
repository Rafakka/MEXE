
import { ENDPOINTS } from "../api/endpoints";

const MAX_ATTEMPTS = 3;
const RETRY_DELAY = 2000;

function wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export async function recoverConnection(): Promise<boolean> {

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {

        console.log(
            `>>> Connection recovery attempt ${attempt}/${MAX_ATTEMPTS}`
        );

        try {

            const response = await fetch(ENDPOINTS.READY);

            if (response.ok) {

                console.log(">>> Backend connection recovered");

                return true;
            }

        } catch (error) {

            console.error(
                `>>> Recovery attempt ${attempt} failed`,
                error
            );
        }

        if (attempt < MAX_ATTEMPTS) {

            console.log(
                `>>> Waiting ${RETRY_DELAY}ms before next attempt`
            );

            await wait(RETRY_DELAY);
        }
    }

    console.log(">>> Backend connection could not be recovered");

    return false;
}
