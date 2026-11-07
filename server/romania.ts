import {readFileSync} from 'node:fs';
const region=JSON.parse(readFileSync(new URL('../public/region.geojson',import.meta.url),'utf8'));
const geometry=region.features.find((f:any)=>f.properties.country==='ROU').geometry;
function inRing(lon:number,lat:number,ring:number[][]){
 let inside=false;
 for(let i=0,j=ring.length-1;i<ring.length;j=i++){
  const a=ring[i],b=ring[j];
  if((a[1]>lat)!==(b[1]>lat)&&lon<(b[0]-a[0])*(lat-a[1])/(b[1]-a[1])+a[0])inside=!inside;
 }
 return inside;
}
export function inRomania(lon:number,lat:number){
 const polygons=geometry.type==='Polygon'?[geometry.coordinates]:geometry.coordinates;
 return polygons.some((rings:number[][][])=>inRing(lon,lat,rings[0])&&!rings.slice(1).some(ring=>inRing(lon,lat,ring)));
}
