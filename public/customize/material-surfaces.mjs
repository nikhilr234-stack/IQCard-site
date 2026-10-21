// The same immutable colour map and UV rectangle are used by preview, swatches and print.
export const MATERIAL_SURFACE_VERSION='iq-surface-pairs-v3';
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
export const MATERIAL_BACK_SURFACES=Object.freeze({
  "Concrete": {
    "key": "concrete-back-v3",
    "url": "/customize/surfaces/v3/back/concrete.webp",
    "width": 1580,
    "height": 995,
    "sha256": "1c74f6ea86f8994b2bea29c8dd1d642f4cd4d71765d75c49b3131c3fc569014a"
  },
  "Ivory Marble": {
    "key": "ivory-marble-back-v3",
    "url": "/customize/surfaces/v3/back/ivory-marble.webp",
    "width": 1582,
    "height": 994,
    "sha256": "3bf31ca9c6792e03df434deb8394d9c0b08d8a29ddcc4fef489ce71aab31ef84"
  },
  "Natural Oak": {
    "key": "natural-oak-back-v3",
    "url": "/customize/surfaces/v3/back/natural-oak.webp",
    "width": 1576,
    "height": 998,
    "sha256": "c5b92e1b7ff96a9a93b5948694e6b7a4f7b4fd946f38994de6615b1cf349dca1"
  },
  "Oxidised Steel": {
    "key": "oxidised-steel-back-v3",
    "url": "/customize/surfaces/v3/back/oxidised-steel.webp",
    "width": 1575,
    "height": 999,
    "sha256": "7feea381ed027d8adb497aa221e4476147c4705934ef3e3b5b995b553dffd47c"
  },
  "Travertine": {
    "key": "travertine-back-v3",
    "url": "/customize/surfaces/v3/back/travertine.webp",
    "width": 1623,
    "height": 969,
    "sha256": "578d91f9d82127e58b80fe98f84bf737373f5b49e5e637bc3f85d2265c287bf6"
  },
  "Walnut": {
    "key": "walnut-back-v3",
    "url": "/customize/surfaces/v3/back/walnut.webp",
    "width": 1576,
    "height": 998,
    "sha256": "a806f5062810dcb35e9fbdc84f7163cdd6d8bd254c4adca7d4d51bb52436ad9b"
  }
});
export function surfaceFor(config,face='front'){
  if(!['front','back'].includes(face))throw new Error('Choose a valid material face: front or back.');
  if(config?.step==='core'||config?.customColor)return null;
  const surface=(face==='back'?MATERIAL_BACK_SURFACES[config?.material]:null)||MATERIAL_SURFACES[config?.material];
  if(!surface)throw new Error('The saved material has no approved surface map. No substitute was loaded.');
  return surface;
}
export class SurfaceMapCache{
  constructor(load){this.load=load;this.pending=new Map();}
  get(config,face='front'){
    const surface=surfaceFor(config,face);if(!surface)return Promise.resolve(null);
    if(!this.pending.has(surface.key)){
      const task=Promise.resolve().then(()=>this.load(surface)).then(result=>({...result,surface})).catch(error=>{this.pending.delete(surface.key);throw error;});
      this.pending.set(surface.key,task);
    }
    return this.pending.get(surface.key);
  }
}
