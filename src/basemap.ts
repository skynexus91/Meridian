import * as maplibregl from 'maplibre-gl';
import type {Map as MapType,MapOptions,StyleSpecification} from 'maplibre-gl';
import {createTomTomMap,prepareMapLibre} from './tomtomMap';

export type BasemapProvider='azure'|'tomtom'|'osm';

const azureKey=(import.meta.env.VITE_AZURE_MAPS_KEY as string|undefined)?.trim();

export function hasAzure(){return Boolean(azureKey);}

function tint(dark:boolean){return {'raster-saturation':dark?-.6:0,'raster-brightness-max':dark?.45:1};}

export function basemapStyle(provider:'azure'|'osm',dark:boolean):StyleSpecification{
 if(provider==='azure'){
  const tiles=`https://atlas.microsoft.com/map/tile?api-version=2024-04-01&tilesetId=microsoft.base.road&zoom={z}&x={x}&y={y}&tileSize=256&subscription-key=${encodeURIComponent(azureKey??'')}`;
  return {
   version:8,
   sources:{osm:{type:'raster',tiles:[tiles],tileSize:256,maxzoom:19,attribution:'© Microsoft, © TomTom'}},
   layers:[{id:'osm',type:'raster',source:'osm',paint:tint(dark)}],
  };
 }
 return {
  version:8,
  sources:{osm:{type:'raster',tiles:['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],tileSize:256,maxzoom:19,attribution:'© OpenStreetMap contributors'}},
  layers:[{id:'osm',type:'raster',source:'osm',paint:tint(dark)}],
 };
}

export function applyBasemap(map:MapType,provider:'azure'|'osm',dark:boolean){
 const style=basemapStyle(provider,dark);
 if(map.getLayer('osm'))map.removeLayer('osm');
 if(map.getSource('osm'))map.removeSource('osm');
 for(const [id,source] of Object.entries(style.sources))map.addSource(id,source as Parameters<MapType['addSource']>[1]);
 const before=map.getStyle().layers?.find(layer=>layer.id!=='osm')?.id;
 for(const layer of style.layers)before?map.addLayer(layer,before):map.addLayer(layer);
}

export function createBasemapMap(container:HTMLElement,options:Omit<MapOptions,'style'|'container'>,dark:boolean):{map:MapType;provider:BasemapProvider}{
 prepareMapLibre();
 if(hasAzure()){
  try{return {map:new maplibregl.Map({...options,container,style:basemapStyle('azure',dark),attributionControl:false}),provider:'azure'};}catch{}
 }
 try{return {map:createTomTomMap({...options,container},dark).mapLibreMap,provider:'tomtom'};}catch{}
 return {map:new maplibregl.Map({...options,container,style:basemapStyle('osm',dark),attributionControl:false}),provider:'osm'};
}
