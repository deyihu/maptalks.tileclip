# maptalks.tileclip

[maptalks](https://github.com/maptalks/maptalks.js) TileLayer clip tool

* This plugin requires the runtime environment to support [OffscreenCanvas](https://developer.mozilla.org/zh-CN/docs/Web/API/OffscreenCanvas)
    

 * Considering performance, all operations are completed within the web worker

## Examples

* [simple data filter](https://deyihu.github.io/maptalks.query/demo/base.html)
* [simple spatial query](https://deyihu.github.io/maptalks.query/demo/base-spatial.html)
* [vt data filter](https://deyihu.github.io/maptalks.query/demo/vt.html)
* [vt spatial query](https://deyihu.github.io/maptalks.query/demo/vt-spatial.html)
* [spatial query operator](https://deyihu.github.io/maptalks.query/demo/spatial-op.html)
* [buffer query](https://deyihu.github.io/maptalks.query/demo/buffer.html)
* [multi layers query](https://deyihu.github.io/maptalks.query/demo/mutl-layer.html)
* [mock map identify](https://deyihu.github.io/maptalks.query/demo/mock-identify.html)
* [tileclusterlayer query](https://deyihu.github.io/maptalks.query/demo/tileclusterlayer.html)

## Install

### NPM

```sh
npm i maptalks
#or
# npm i maptalks-gl
npm i maptalks.tileclip
```

## CDN

```html
<script type="text/javascript" src="https://cdn.jsdelivr.net/npm/maptalks-gl/dist/maptalks-gl.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/maptalks.tileclip/dist/maptalks.tileclip.js"></script>
```

## API

### `getTileActor()`

return TileActor instance

```js
import {
    getTileActor
} from 'maptalks.tileclip'

const tileActor = getTileActor();
```

### `TileActor` class

Tile clip worker interaction class. abount [maptalks. Actor](https://github.com/maptalks/maptalks.js/blob/master/src/core/worker/Actor.ts)

```js
import {
    getTileActor
} from 'maptalks.tileclip'

const tileActor = getTileActor();
```

#### methods

* `getTile(options)` get tile imagebitmap by fetch in worker, return `Promise`
  + `options.url`:data filter function

```js
import {
    getTileActor
} from 'maptalks.tileclip'

const tileActor = getTileActor();

tileActor.getTile({
    url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/12/1663/3425'
}).then(imagebitmap => {
    consle.log(imagebitmap);
}).catch(error => {
    //do some things
})
```

* `injectMask(maskId,Polygon/MultiPolygon)` inject Mask(GeoJSON. Polygon) for clip tiles . return `Promise`

  + `maskId`: mask id, Cache mask data in the worker
  + `Polygon/MultiPolygon` GeoJSON Polygon/MultiPolygon [GeoJSON SPEC](https://datatracker.ietf.org/doc/html/rfc7946#section-3.1.6)

```js
import {
    getTileActor
} from 'maptalks.tileclip'

const maskId = 'china';

const tileActor = getTileActor();
const polygon = {
    "type": "Feature",
    "geometry": {
        "type": "Polygon",
        "coordinates": []
    }
}

tileActor.injectMask(maskId, polygon).then(data => {
    // baseLayer.addTo(map);
}).catch(error => {
    console.error(error);
})
```

* `removeMask(maskId)` remove Mask from cache . return `Promise`

  + `maskId`: mask id

```js
import {
    getTileActor
} from 'maptalks.tileclip'

const maskId = 'china';

const tileActor = getTileActor();
const polygon = {
    "type": "Feature",
    "geometry": {
        "type": "Polygon",
        "coordinates": []
    }
}

tileActor.removeMask(maskId).then(data => {

}).catch(error => {
    console.error(error);
})
```

* `clipTile(options)` clip tile by mask . return `Promise`
  + `options.tile`:tile imagebitmap data
  + `options.tileBBOX`:tile BBOX
  + `options.projection`: Projection code, such as : EPSG:3857
  + `options.tileSize`:tile size 
  + `options.maskId`:mask key

```js
import * as maptalks from 'maptalks';
import {
    getTileActor
} from 'maptalks.tileclip'
const tileActor = maptalks.getTileActor();
const maskId = '1';
const baseLayer = new maptalks.TileLayer('base', {
    debug: true,
    urlTemplate: '/arcgisonline/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    subdomains: ["a", "b", "c", "d"],
    // bufferPixel: 1
})

baseLayer.on('renderercreate', function(e) {
    //load tile image
    //   img(Image): an Image object
    //   url(String): the url of the tile
    e.renderer.loadTileBitmap = function(url, tile, callback) {
        //get Tile data
        tileActor.getTile({
            url: maptalks.Util.getAbsoluteURL(url)
        }).then(imagebitmap => {

            //clip tile
            tileActor.clipTile({
                tile: imagebitmap,
                tileBBOX: baseLayer._getTileBBox(tile),
                projection: baseLayer.getProjection().code,
                tileSize: baseLayer.getTileSize().width,
                maskId,
            }).then(image => {
                callback(image);
            }).catch(error => {
                //do some things
                console.error(error);
            })
        }).catch(error => {
            //do some things
            console.error(error);
        })
    };
});
```
