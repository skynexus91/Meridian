import {TomTomMap} from '@tomtom-org/maps-sdk/map';
import {setWorkerUrl,type MapOptions} from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import 'maplibre-gl/dist/maplibre-gl.css';

export function createTomTomMap(options:Omit<MapOptions,'style'>,dark=false){
 setWorkerUrl(workerUrl);
 return new TomTomMap({
  commonBaseURL:location.origin+'/api/tomtom-map',
  style:{type:'standard',id:dark?'streetDarkDriving':'streetLightDriving',include:[]},
  mapLibre:options,
 });
}
