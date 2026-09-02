

import {postBlob} from "../api/http";
import { ENDPOINTS } from "../api/endpoints";
import type {ImageMetadata} from "../types/imageType";
import {getImageMetadata} from "../../src/features/laboratory/utils/getImageMetadata";

export type BlendResult = {
    url:string;
    metadata: ImageMetadata;
};

export async function blend(

    firstFile: File,

    secondFile: File

): Promise<BlendResult> {

    const formData = new FormData();

    formData.append("implicit_image_a", firstFile);

    formData.append("implicit_image_b", secondFile);

    formData.append("width","1024");

    formData.append("height","1024");

    const blob = await postBlob(
        ENDPOINTS.BLEND,
        formData,
    );

    console.log(blob);
    console.log(blob.size);
    console.log(blob.type);

    const url = URL.createObjectURL(blob);

    const metadata = await getImageMetadata(blob);

    console.log(metadata);

    return {
        url,
        metadata
    };

}


