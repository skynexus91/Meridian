/// <reference types="vite/client" />

declare namespace google.maps{
  class Map{constructor(el:HTMLElement,opts?:MapOptions);setCenter(latlng:LatLngLiteral|LatLng):void;setZoom(zoom:number):void;getZoom():number;panTo(latlng:LatLngLiteral|LatLng):void;setMap(map:Map|null):void;}
  interface MapOptions{center?:LatLngLiteral;zoom?:number;mapTypeId?:MapTypeId|string;styles?:any[];}
  interface LatLngLiteral{lat:number;lng:number;}
  class LatLng{constructor(lat:number,lng:number);}
  enum MapTypeId{ROADMAP='roadmap',SATELLITE='satellite',HYBRID='hybrid',TERRAIN='terrain'}
}
declare var google:{maps:typeof google.maps};
