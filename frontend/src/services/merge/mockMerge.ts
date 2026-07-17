
import type { MergeResult } from "./types";

export async function mockMerge(): Promise<MergeResult> {

    await new Promise(resolve => setTimeout(resolve, 7000));

    return {

        id: crypto.randomUUID(),

        imageUrl: "/mock/result.png",

        processingTime: 7000,

        createdAt: new Date().toISOString()

    };

}
