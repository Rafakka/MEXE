

import {postBlob} from "../../api/http";
import { ENDPOINTS } from "../../api/endpoints";

export async function blend(

    firstFile: File,

    secondFile: File

): Promise<string> {

    const formData = new FormData();

    formData.append("implicit_image_a", firstFile);

    formData.append("implicit_image_b", secondFile);

    formData.append("width","1024");

    formData.append("height","1024");

    const blob = await postBlob(
        ENDPOINTS.BLEND,
        formData,
    );

    return URL.createObjectURL(blob);

}


