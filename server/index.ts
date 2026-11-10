export {};
try{process.loadEnvFile();}catch{/* Optional local configuration. */}
const {buildApp}=await import('./app.js');const {collectFeeds}=await import('./feeds.js');
const {restoreCameraCatalog,refreshCameraCatalog}=await import('./camera-catalog.js');restoreCameraCatalog();
const app=await buildApp();await app.listen({port:Number(process.env.PORT??3001),host:process.env.HOST??'127.0.0.1'});console.log(`Meridian · Romania API: http://127.0.0.1:${process.env.PORT??3001}`);
if(process.env.DISABLE_SCHEDULER!=='1'){void refreshCameraCatalog();setInterval(()=>void refreshCameraCatalog(),6*3600000).unref();void collectFeeds();setInterval(()=>void collectFeeds(),60000).unref();}
for(const sig of ['SIGINT','SIGTERM'] as const)process.on(sig,async()=>{await app.close();process.exit(0);});
