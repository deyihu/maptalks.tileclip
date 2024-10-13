export function getTile(url, options = {}) {
    return new Promise((resolve, reject) => {
        if (!url) {
            reject(new Error('url is null'));
            return;
        }
        fetch(url).then(res => res.blob()).then(blob => createImageBitmap(blob)).then(imagebit => {
            resolve(imagebit);
        }).catch(error => {
            reject(error);
        });
    });
}
