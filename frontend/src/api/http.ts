

export async function get<T>(url: string): Promise<T> {

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }

    return response.json() as Promise<T>;

}

export async function post<T>(
    url: string,
    body: BodyInit
): Promise<T> {

    const response = await fetch(url, {

        method: "POST",

        body,

    });

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }

    return response.json() as Promise<T>;

}
