import { registerWorkerAdapter, worker } from 'maptalks';
import { getWorkerCode, getWorkerName } from './src/worker/getworker';
import { isPolygon } from './src/tileclip';

registerWorkerAdapter(getWorkerName(), getWorkerCode());

class TileActor extends worker.Actor {

    getTile(options = {}) {
        return new Promise((resolve, reject) => {
            this.send(Object.assign({}, { _type: 'getTile' }, options), null, (error, image) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(image);
                }
            });
        });
    }

    clipTile(options = {}) {
        return new Promise((resolve, reject) => {
            const buffers = [];
            if (options.tile && options.tile instanceof ImageBitmap) {
                buffers.push(options.tile);
            }
            this.send(Object.assign({}, { _type: 'clipTile' }, options), buffers, (error, image) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(image);
                }
            });
        });
    }

    injectMask(maskId, geojsonFeature) {
        return new Promise((resolve, reject) => {
            if (!maskId) {
                reject(new Error('maskId is null'));
                return;
            }
            if (!isPolygon(geojsonFeature)) {
                reject(new Error('geojsonFeature is not Polygon,It should be GeoJSON Polygon/MultiPolygon'));
                return;
            }
            this.broadcast({
                maskId,
                geojsonFeature,
                _type: 'injectMask'
            }, [], (error, data) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve();
            });
        });
    }
}

let actor;

export function getTileActor() {
    if (!actor) {
        actor = new TileActor(getWorkerName());
    }
    return actor;
}
