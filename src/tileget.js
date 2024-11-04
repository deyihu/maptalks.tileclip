import { getCanvas, imageFilter } from './cavnas';

const headers = {
    'accept': 'image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36 Edg/107.0.1418.26'
};

export function getTile(url, options = {}) {
    return new Promise((resolve, reject) => {
        if (!url) {
            reject(new Error('url is null'));
            return;
        }
        fetch(url, {
            headers
        }).then(res => res.blob()).then(blob => createImageBitmap(blob)).then(imagebit => {
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
