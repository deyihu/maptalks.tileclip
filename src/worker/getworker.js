// eslint-disable-next-line quotes
const workerCode = ` function (exports) { 'use strict';

  function bbox(geojson) {
    let b = [
      Number.POSITIVE_INFINITY,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
    ];
    switch (geojson.type) {
      case 'FeatureCollection':
        const len = geojson.features.length;
        for (let i = 0; i < len; i++) {
          feature(geojson.features[i], b);
        }
        break;
      case 'Feature':
        feature(geojson, b);
        break;
      default:
        geometry(geojson, b);
        break;
    }
    return b;
  }

  function feature(f, b) {
    geometry(f.geometry, b);
  }

  function geometry(g, b) {
    if (!g) {
      return;
    }
    switch (g.type) {
      case 'Point':
        point(g.coordinates, b);
        break;
      case 'MultiPoint':
        line(g.coordinates, b);
        break;
      case 'LineString':
        line(g.coordinates, b);
        break;
      case 'MultiLineString':
        multiline(g.coordinates, b);
        break;
      case 'Polygon':
        polygon(g.coordinates, b);
        break;
      case 'MultiPolygon':
        multipolygon(g.coordinates, b);
        break;
      case 'GeometryCollection':
        const len = g.geometries.length;
        for (let i = 0; i < len; i++) {
          geometry(g.geometries[i], b);
        }
        break;
    }
  }

  function point(p, b) {
    b[0] = Math.min(b[0], p[0]);
    b[1] = Math.min(b[1], p[1]);
    b[2] = Math.max(b[2], p[0]);
    b[3] = Math.max(b[3], p[1]);
  }

  function line(l, b) {
    for (let i = 0, len = l.length; i < len; i++) {
      point(l[i], b);
    }
  }

  function multiline(ml, b) {
    for (let i = 0, len = ml.length; i < len; i++) {
      line(ml[i], b);
    }
  }

  function polygon(p, b) {
    //Just calculate the outer ring,Don't participate in the calculation of holes
    //测试10000个鄱阳湖的数据,表现为性能可以提高25%
    if (p.length) {
      line(p[0], b);
    }
  }

  function multipolygon(mp, b) {
    for (let i = 0, len = mp.length; i < len; i++) {
      polygon(mp[i], b);
    }
  }

  var lineclip_1 = lineclip;

  lineclip.polyline = lineclip;
  lineclip.polygon = polygonclip;


  // Cohen-Sutherland line clippign algorithm, adapted to efficiently
  // handle polylines rather than just segments

  function lineclip(points, bbox, result) {

      var len = points.length,
          codeA = bitCode(points[0], bbox),
          part = [],
          i, a, b, codeB, lastCode;

      if (!result) result = [];

      for (i = 1; i < len; i++) {
          a = points[i - 1];
          b = points[i];
          codeB = lastCode = bitCode(b, bbox);

          while (true) {

              if (!(codeA | codeB)) { // accept
                  part.push(a);

                  if (codeB !== lastCode) { // segment went outside
                      part.push(b);

                      if (i < len - 1) { // start a new line
                          result.push(part);
                          part = [];
                      }
                  } else if (i === len - 1) {
                      part.push(b);
                  }
                  break;

              } else if (codeA & codeB) { // trivial reject
                  break;

              } else if (codeA) { // a outside, intersect with clip edge
                  a = intersect(a, b, codeA, bbox);
                  codeA = bitCode(a, bbox);

              } else { // b outside
                  b = intersect(a, b, codeB, bbox);
                  codeB = bitCode(b, bbox);
              }
          }

          codeA = lastCode;
      }

      if (part.length) result.push(part);

      return result;
  }

  // Sutherland-Hodgeman polygon clipping algorithm

  function polygonclip(points, bbox) {

      var result, edge, prev, prevInside, i, p, inside;

      // clip against each side of the clip rectangle
      for (edge = 1; edge <= 8; edge *= 2) {
          result = [];
          prev = points[points.length - 1];
          prevInside = !(bitCode(prev, bbox) & edge);

          for (i = 0; i < points.length; i++) {
              p = points[i];
              inside = !(bitCode(p, bbox) & edge);

              // if segment goes through the clip window, add an intersection
              if (inside !== prevInside) result.push(intersect(prev, p, edge, bbox));

              if (inside) result.push(p); // add a point if it's inside

              prev = p;
              prevInside = inside;
          }

          points = result;

          if (!points.length) break;
      }

      return result;
  }

  // intersect a segment against one of the 4 lines that make up the bbox

  function intersect(a, b, edge, bbox) {
      return edge & 8 ? [a[0] + (b[0] - a[0]) * (bbox[3] - a[1]) / (b[1] - a[1]), bbox[3]] : // top
             edge & 4 ? [a[0] + (b[0] - a[0]) * (bbox[1] - a[1]) / (b[1] - a[1]), bbox[1]] : // bottom
             edge & 2 ? [bbox[2], a[1] + (b[1] - a[1]) * (bbox[2] - a[0]) / (b[0] - a[0])] : // right
             edge & 1 ? [bbox[0], a[1] + (b[1] - a[1]) * (bbox[0] - a[0]) / (b[0] - a[0])] : // left
             null;
  }

  // bit code reflects the point position relative to the bbox:

  //         left  mid  right
  //    top  1001  1000  1010
  //    mid  0001  0000  0010
  // bottom  0101  0100  0110

  function bitCode(p, bbox) {
      var code = 0;

      if (p[0] < bbox[0]) code |= 1; // left
      else if (p[0] > bbox[2]) code |= 2; // right

      if (p[1] < bbox[1]) code |= 4; // bottom
      else if (p[1] > bbox[3]) code |= 8; // top

      return code;
  }

  let canvas;

  function getCanvas(tileSize = 256) {
      if (!canvas && OffscreenCanvas) {
          canvas = new OffscreenCanvas(1, 1);
      }
      if (canvas) {
          canvas.width = canvas.height = tileSize;
      }
      return canvas;
  }

  function clearCanvas(ctx) {
      const canvas = ctx.canvas;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  function getCanvasContext(canvas) {
      const ctx = canvas.getContext('2d');
      clearCanvas(ctx);
      return ctx;
  }

  function getBlankTile() {
      const canvas = getCanvas();
      const ctx = getCanvasContext(canvas);
      clearCanvas(ctx);
      // ctx.fillText('404', 100, 100);
      // ctx.rect(0, 0, canvas.width, canvas.height);
      // ctx.stroke();
      return canvas.transferToImageBitmap();
  }

  function imageClip(canvas, polygons, image) {
      const ctx = getCanvasContext(canvas);
      clearCanvas(ctx);
      ctx.save();

      const drawPolygon = (rings) => {
          for (let i = 0, len = rings.length; i < len; i++) {
              const ring = rings[i];
              const first = ring[0], last = ring[ring.length - 1];
              const [x1, y1] = first;
              const [x2, y2] = last;
              if (x1 !== x2 || y1 !== y2) {
                  ring.push(first);
              }
              for (let j = 0, len1 = ring.length; j < len1; j++) {
                  const [x, y] = ring[j];
                  if (j === 0) {
                      ctx.moveTo(x, y);
                  } else {
                      ctx.lineTo(x, y);
                  }
              }
          }
      };
      ctx.beginPath();
      polygons.forEach(polygon => {
          drawPolygon(polygon);
      });
      ctx.clip('evenodd');
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      const bitImage = canvas.transferToImageBitmap();
      ctx.restore();
      return bitImage;
  }

  function bboxIntersect(bbox1, bbox2) {
      if (bbox1[2] < bbox2[0]) {
          return false;
      }
      if (bbox1[1] > bbox2[3]) {
          return false;
      }
      if (bbox1[0] > bbox2[2]) {
          return false;
      }
      if (bbox1[3] < bbox2[1]) {
          return false;
      }
      return true;
  }

  function bboxInBBOX(bbox1, bbox2) {
      const [x1, y1, x2, y2] = bbox1;
      return x1 >= bbox2[0] && x2 <= bbox2[2] && y1 >= bbox2[1] && y2 <= bbox2[3];
  }

  const GeoJSONCache = {};

  function isPolygon(feature) {
      if (!feature) {
          return false;
      }
      const geometry = feature.geometry || feature;
      const type = geometry.type;
      return type === 'Polygon' || type === 'MultiPolygon';
  }

  function is3857(projection) {
      return projection === 'EPSG:3857';
  }

  function injectMask(maskId, geojson) {
      if (!isPolygon(geojson)) {
          return new Error('geojson is not Polygon');
      }
      if (GeoJSONCache[maskId]) {
          return new Error('the' + maskId + ' geojson Already exists');
      }
      GeoJSONCache[maskId] = geojson;
      checkGeoJSONFeatureBBOX(geojson);
      return geojson;
  }

  function checkGeoJSONFeatureBBOX(feature) {
      feature.bbox = feature.bbox || bbox(feature);
  }

  function lnglat2Mercator(coordinates) {
      const [lng, lat] = coordinates;
      const earthRad = 6378137.0;
      const x = lng * Math.PI / 180 * earthRad;
      const a = lat * Math.PI / 180;
      const y = earthRad / 2 * Math.log((1.0 + Math.sin(a)) / (1.0 - Math.sin(a)));
      return [x, y];
  }

  function transformCoordinates(projection, coordinates) {
      if (!is3857(projection)) {
          return coordinates;
      } else {
          const transformRing = (coord) => {
              const result = [];
              for (let i = 0, len = coord.length; i < len; i++) {
                  const c = coord[i];
                  if (Array.isArray(c[0])) {
                      result.push(transformRing(c));
                  } else {
                      result[i] = lnglat2Mercator(c);
                  }
              }
              return result;
          };
          return transformRing(coordinates);
      }
  }

  function coordinate2Pixel(tileBBOX, tileSize, coordinate) {
      const [minx, miny, maxx, maxy] = tileBBOX;
      const dx = (maxx - minx), dy = (maxy - miny);
      const ax = dx / tileSize, ay = dy / tileSize;
      const [x, y] = coordinate;
      const px = (x - minx) / ax;
      const py = tileSize - (y - miny) / ay;
      return [px, py];
  }

  function toPixels(projection, tileBBOX, tileSize, coordinates) {
      const [minx, miny, maxx, maxy] = tileBBOX;
      if (is3857(projection)) {
          const [mminx, mminy] = lnglat2Mercator([minx, miny]);
          const [mmaxx, mmaxy] = lnglat2Mercator([maxx, maxy]);
          const mTileBBOX = [mminx, mminy, mmaxx, mmaxy];
          const transformRing = (coord) => {
              const result = [];
              for (let i = 0, len = coord.length; i < len; i++) {
                  const c = coord[i];
                  if (Array.isArray(c[0])) {
                      result.push(transformRing(c));
                  } else {
                      result[i] = coordinate2Pixel(mTileBBOX, tileSize, c);
                  }
              }
              return result;
          };
          return transformRing(coordinates);
      }
  }

  function clip(options = {}) {
      const { tile, tileBBOX, projection, tileSize, maskId } = options;
      if (!tile) {
          return new Error('tile is null.It should be a ImageBitmap');
      }
      if (!tileBBOX) {
          return new Error('tileBBOX is null');
      }
      if (!projection) {
          return new Error('projection is null');
      }
      if (!tileSize) {
          return new Error('tileSize is null');
      }
      if (!maskId) {
          return new Error('maskId is null');
      }
      const polygon = GeoJSONCache[maskId];
      if (!polygon) {
          return new Error('not find mask by maskId:' + maskId);
      }
      const canvas = getCanvas(tileSize);
      if (!canvas) {
          return new Error('not find canvas.The current environment does not support OffscreenCanvas');
      }
      const feature = GeoJSONCache[maskId];
      const bbox$1 = feature.bbox;
      if (!bboxIntersect(bbox$1, tileBBOX)) {
          return getBlankTile();
      }
      const { coordinates, type } = polygon.geometry;
      let polygons = coordinates;
      if (type === 'Polygon') {
          polygons = [polygons];
      }

      let newCoordinates;
      if (bboxInBBOX(bbox$1, tileBBOX)) {
          newCoordinates = transformCoordinates(projection, polygons);
          const pixels = toPixels(projection, tileBBOX, tileSize, newCoordinates);
          const image = imageClip(canvas, pixels, tile);
          return image;
      }

      const validateClipRing = (result) => {
          if (result.length > 0) {
              let minx = Infinity, maxx = -Infinity, miny = Infinity, maxy = -Infinity;
              for (let j = 0, len1 = result.length; j < len1; j++) {
                  const [x, y] = result[j];
                  minx = Math.min(x, minx);
                  miny = Math.min(y, miny);
                  maxx = Math.max(x, maxx);
                  maxy = Math.max(y, maxy);
              }
              if (minx !== maxx && miny !== maxy) {
                  return true;
              }
          }
          return false;
      };

      const clipRings = [];
      for (let i = 0, len = polygons.length; i < len; i++) {
          const polygon = polygons[i];
          for (let j = 0, len1 = polygon.length; j < len1; j++) {
              const ring = polygon[j];
              const result = lineclip_1.polygon(ring, tileBBOX);
              if (validateClipRing(result)) {
                  clipRings.push([result]);
              }
          }
      }
      if (clipRings.length === 0) {
          return getBlankTile();
      }

      newCoordinates = transformCoordinates(projection, clipRings);
      const pixels = toPixels(projection, tileBBOX, tileSize, newCoordinates);
      const image = imageClip(canvas, pixels, tile);
      return image;
  }

  function getTile(url, options = {}) {
      return new Promise((resolve, reject) => {
          if (!url) {
              reject(new Error('url is null'));
              return;
          }
          fetch(url).then(res => res.blob()).then(blob => {
              createImageBitmap(blob).then(image => {
                  resolve(image);
              });
          }).catch(error => {
              reject(error);
          });
      });
  }

  const initialize = function () {
  };

  const onmessage = function (message, postResponse) {
      const data = message.data;
      const { _type } = data;
      if (_type === 'getTile') {
          const { url } = data;
          getTile(url, data).then(image => {
              postResponse(null, image);
          }).catch(error => {
              postResponse(error);
          });
          return;
      }
      if (_type === 'clipTile') {
          const image = clip(data);
          if (image instanceof Error) {
              postResponse(image);
              return;
          }
          postResponse(null, image);
      }
      if (_type === 'injectMask') {
          const geojson = injectMask(data.maskId, data.geojsonFeature);
          if (geojson instanceof Error) {
              postResponse(geojson);
              return;
          }
          postResponse(null, geojson);
      }
  };

  exports.initialize = initialize;
  exports.onmessage = onmessage;

  Object.defineProperty(exports, '__esModule', { value: true });

}`;
const workerName = '__maptalks.tileclip';

export function getWorkerName() {
    return workerName;
}

export function getWorkerCode() {
    return workerCode;
}
