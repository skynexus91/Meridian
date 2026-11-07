export type ActivityName='return_session'|'place_followed'|'event_opened'|'source_opened'|'map_shared'|'station_player_opened'|'station_started'|'layer_enabled';
let sessionRecorded=false;
export function track(name:ActivityName){try{const raw=JSON.parse(localStorage.getItem('meridian:activity')??'[]');const events=Array.isArray(raw)?raw:[];localStorage.setItem('meridian:activity',JSON.stringify([...events,{name,at:new Date().toISOString()}].slice(-500)));}catch{/* Local usage counts never block the interface. */}}
export function recordSession(){if(!sessionRecorded){sessionRecorded=true;track('return_session');}}
// Counts stay on this browser. No network analytics, user identity, coordinates or article URLs are recorded.
