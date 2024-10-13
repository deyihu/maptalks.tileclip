import { clip, injectMask, removeMask } from './tileclip';
import { getTile } from './tileget';

export const initialize = function () {
};

export const onmessage = function (message, postResponse) {
    const data = message.data || {};
    const type = data._type;
    if (type === 'getTile') {
        const { url } = data;
        getTile(url, data).then(image => {
            postResponse(null, image, [image]);
        }).catch(error => {
            postResponse(error);
        });
        return;
    }
    if (type === 'clipTile') {
        const image = clip(data);
        if (image instanceof Error) {
            postResponse(image);
            return;
        }
        postResponse(null, image, [image]);
    }
    if (type === 'injectMask') {
        const geojson = injectMask(data.maskId, data.geojsonFeature);
        if (geojson instanceof Error) {
            postResponse(geojson);
            return;
        }
        postResponse();
    }
    if (type === 'removeMask') {
        removeMask(data.maskId);
        postResponse();
    }
};
