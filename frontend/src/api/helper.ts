

export async function postBlob(
    url: string,
    body: BodyInit
): Promise<Blob> {

    const response = await fetch(url, {

        method: "POST",

        body,

    });

    if (!response.ok) {

        throw new Error(`HTTP ${response.status}`);

    }

    return response.blob();

}
