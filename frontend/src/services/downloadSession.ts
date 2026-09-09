


export function downloadSession(file:Blob, id: string): void {

    const url = URL.createObjectURL(file);

    const link = document.createElement("a");
    link.href = url;
    link.download = `${id}.mx`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);

}
