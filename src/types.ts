export type Country = string;
export type Category = 'public-affairs'|'transport'|'weather'|'community'|'economy'|'health'|'war';
export interface Place {county?:string;locality?:string;road?:{id:number;name:string;tags:Record<string,string>;geometry:{lat:number;lon:number}[]};id:string;name:string;country:Country;region:string;lat:number;lon:number;aliases:string[]}
export interface Source {localities?:string[];additionalFeeds?:string[];id:string;name:string;country:Country;type:'newspaper'|'agency'|'tv'|'radio'|'official';url:string;feed?:string;region?:string;enabled:boolean;rights:string;language:string;status?:'live'|'stale'|'error'|'disabled';lastSuccess?:string;lastAttempt?:string;error?:string;articles?:number}
export interface Article {image?:string;id:string;sourceId:string;sourceName:string;sourceType:Source['type'];url:string;title:string;publishedAt:string;fetchedAt:string;country:Country;language:string;category:Category;place?:Place;chain:string;timeBasis?:'published'|'first-seen';revisions?:{at:string;previousTitle:string}[]}
export interface NewsEvent {id:string;title:string;country:Country;category:Category;place?:Place;precision:'city'|'country';updatedAt:string;publishedAt:string;articles:Article[];independentSources:number;revisions?:{at:string;note:string}[]}
export interface Station {streams?:string[];codec?:string;id:string;name:string;country:Country;region:string;city:string;genre:'news'|'music'|'culture';url:string;stream?:string;lat:number;lon:number;rights:string}
export interface Camera {id:string;name:string;country:Country;place:string;lat?:number;lon?:number;url:string;embed?:string;status:string;rights:string}
export interface Observation {id:string;kind:'air'|'sea'|'road';lat:number;lon:number;name:string;observedAt:string;heading?:number;speed?:number;altitude?:number;description?:string;source:string}
export interface Airport {id:string;name:string;iata?:string;icao?:string;city:string;region:string;lat:number;lon:number;type:'international'|'regional'|'domestic';rights:string}
export interface POI {id:string;name:string;type:'fuel'|'hotel'|'motel'|'pension'|'tourist'|'traffic'|'restaurant'|'parking'|'charging'|'mall'|'speed_bump'|'cemetery'|'auto_service'|'landmark'|'business'|'service';country?:string;city:string;region:string;lat:number;lon:number;rights:string;phone?:string;address?:string;distKm?:number}
export interface Radar {id:number;lat:number;lon:number;type:string;maxspeed?:number}
export interface LayerHealth {id:string;name:string;status:'live'|'stale'|'unavailable'|'configured'|'link-only';detail:string;lastSuccess?:string;url?:string;tileUrl?:string}
export interface WeatherFrame {time:string;url:string}
export interface WeatherLayer {id:string;name:string;provider:string;kind:'satellite'|'radar';frames:WeatherFrame[];legend:string;attribution:string;status:string;detail?:string}
export interface EarthLayer {
 id:string;name:string;category:string;resolution:string;description:string;date:string;url:string;
 maxzoom:number;vector:boolean;legend?:string;provider:string;source:string;attribution:string;stale:boolean;
}
export interface OrbitalSatellite {
 nextPassAt?:string;maximumElevation?:number;id:string;name:string;lat:number;lon:number;altitude:number;epoch:string;calculatedAt:string;track:number[][][];type:string;
}
export type RoutePoint=[number,number];
export interface RouteStep {type?:string;modifier?:string;name?:string;exit?:number;instruction:string;location:RoutePoint;distance:number}
export interface DrivingRoute {steps?:RouteStep[];distance:number;duration:number;geometry:{type:'LineString';coordinates:number[][]};provider:string;calculatedAt:string}
export interface ArticleBlock {kind:'paragraph'|'heading'|'image';text:string;src?:string}
export interface ArticleContent {summaryOnly?:boolean;id:string;title:string;image?:string;blocks:ArticleBlock[];restricted:boolean;url:string;source:string;publishedAt:string;language?:string}
