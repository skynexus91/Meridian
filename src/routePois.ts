import {distanceMeters,routeProgress} from './navigation';
import type {RoutePoint} from './types';
// Sample the next 12 km, rather than sending a whole international route to Overpass.
export function routePoiAnchors(coordinates:number[][],gps?:{lon:number;lat:number}):RoutePoint[]{
 if(!coordinates.length)return [];const progress=gps?routeProgress([gps.lon,gps.lat],coordinates):undefined;const start=progress?.point??coordinates[0] as RoutePoint;const nearest=progress?.segmentIndex??0;const result:RoutePoint[]=[start];let distance=0,last=start;
 for(let i=nearest+1;i<coordinates.length&&result.length<7;i++){const target=coordinates[i] as RoutePoint;const segment=distanceMeters(last,target);if(segment===0)continue;let offset=1800-distance;while(offset<=segment&&result.length<7){const t=offset/segment;result.push([last[0]+(target[0]-last[0])*t,last[1]+(target[1]-last[1])*t]);offset+=1800;}distance=(distance+segment)%1800;last=target;}return result;
}
