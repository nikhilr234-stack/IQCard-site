// The same immutable colour map and UV rectangle are used by preview, swatches and print.
export const MATERIAL_SURFACE_VERSION='iq-surfaces-v2';
export const MATERIAL_SURFACES=Object.freeze({
  "White": {
    "key": "white",
    "url": "/customize/surfaces/v2/white.webp",
    "width": 1577,
    "height": 997,
    "sha256": "b246144dc5d30b97cad814db1f9af5f4a2fdeb73d53f3b59cc7f72f7e6c39c31"
  },
  "Black": {
    "key": "black",
    "url": "/customize/surfaces/v2/black.webp",
    "width": 1575,
    "height": 998,
    "sha256": "feeeb26a4ee35b12d4e54694b3da321ba222bd4c8ac0a529d095f04af144a26c"
  },
  "Graphite": {
    "key": "graphite",
    "url": "/customize/surfaces/v2/graphite.webp",
    "width": 1576,
    "height": 998,
    "sha256": "edf01bd14b02360ce7c32bdb0f3b3f2d61402ce78e742d3452dd426fab651b63"
  },
  "Terracotta": {
    "key": "terracotta",
    "url": "/customize/surfaces/v2/terracotta.webp",
    "width": 1578,
    "height": 997,
    "sha256": "22057d50fd212d24ae883ea026e39a0a3b5a43bb21d22a7bcb9736c6de793502"
  },
  "Mustard": {
    "key": "mustard",
    "url": "/customize/surfaces/v2/mustard.webp",
    "width": 1578,
    "height": 996,
    "sha256": "28e27eff3529e209de1d45f586b201562de95dc83d2437084e00067f2bc9ed0e"
  },
  "Oxblood": {
    "key": "oxblood",
    "url": "/customize/surfaces/v2/oxblood.webp",
    "width": 1579,
    "height": 996,
    "sha256": "dc20e22b6f038839cccd622f157cac0478845e77784c082682c10deab5859e6f"
  },
  "Walnut": {
    "key": "walnut",
    "url": "/customize/surfaces/v2/walnut.webp",
    "width": 1576,
    "height": 998,
    "sha256": "f23b4d6345e3b44dd9f420e50df62a214bbd0c7ace0eb8d4d7d04e7fdae66ba2"
  },
  "Natural Oak": {
    "key": "natural-oak",
    "url": "/customize/surfaces/v2/natural-oak.webp",
    "width": 1575,
    "height": 998,
    "sha256": "2797f122f6478a7fdbaeea724fb7ad5410285c1d13bdc00d0b4c4876f048548d"
  },
  "Travertine": {
    "key": "travertine",
    "url": "/customize/surfaces/v2/travertine.webp",
    "width": 1623,
    "height": 969,
    "sha256": "b0010f735e2b489ab22b96bc36a88dacac48bd51cc806a2e36783d6b81fc0abf"
  },
  "Concrete": {
    "key": "concrete",
    "url": "/customize/surfaces/v2/concrete.webp",
    "width": 1536,
    "height": 1024,
    "sha256": "56015ef0fda3d0e735b12e00ef919fcdc6d9f7e8a3ab1965e8fdabe7d8d031ee"
  },
  "Ivory Marble": {
    "key": "ivory-marble",
    "url": "/customize/surfaces/v2/ivory-marble.webp",
    "width": 1582,
    "height": 994,
    "sha256": "d682d8de935483c2105fcf3252d60a1eafa87bbd9e9ec79dcdebf7660cbe9a32"
  },
  "Oxidised Steel": {
    "key": "oxidised-steel",
    "url": "/customize/surfaces/v2/oxidised-steel.webp",
    "width": 1575,
    "height": 998,
    "sha256": "c1255b3f8e556d63f5d5dbfc8dea826b1a672900e4b414455bfa52c5ed6338db"
  }
});
export function surfaceFor(config){
  if(config?.step==='core'||config?.customColor)return null;
  const surface=MATERIAL_SURFACES[config?.material];
  if(!surface)throw new Error('The saved material has no approved surface map. No substitute was loaded.');
  return surface;
}
export class SurfaceMapCache{
  constructor(load){this.load=load;this.pending=new Map();}
  get(config){
    const surface=surfaceFor(config);if(!surface)return Promise.resolve(null);
    if(!this.pending.has(surface.key)){
      const task=Promise.resolve().then(()=>this.load(surface)).then(result=>({...result,surface})).catch(error=>{this.pending.delete(surface.key);throw error;});
      this.pending.set(surface.key,task);
    }
    return this.pending.get(surface.key);
  }
}
