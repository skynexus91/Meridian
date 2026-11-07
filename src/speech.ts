export function speechChunks(text:string,limit=1800){
 const chunks:string[]=[];let rest=text.trim();while(rest.length>limit){let split=rest.lastIndexOf(' ',limit);if(split<limit/2)split=limit;chunks.push(rest.slice(0,split));rest=rest.slice(split).trimStart();}if(rest)chunks.push(rest);return chunks;
}
