import { getCanvas, imageFilter } from './cavnas';

export function getTile(url, options = {}) {
    return new Promise((resolve, reject) => {
        if (!url) {
            reject(new Error('url is null'));
            return;
        }
        fetch(url).then(res => res.blob()).then(blob => createImageBitmap(blob)).then(imagebit => {
            const filter = options.filter;
            if (filter) {
                const canvas = getCanvas();
                if (!canvas) {
                    reject(new Error('not find canvas.The current environment does not support OffscreenCanvas'));
                } else {
                    resolve(imageFilter(canvas, imagebit, filter));
                }
            } else {
                resolve(imagebit);
            }
        }).catch(error => {
            reject(error);
        });
    });
}
