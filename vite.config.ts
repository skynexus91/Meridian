import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({plugins:[react()],server:{host:'127.0.0.1',port:5173,strictPort:true,watch:{ignored:['**/.vs/**']},proxy:{'/api':{target:'http://127.0.0.1:3001',ws:true}}},build:{chunkSizeWarningLimit:1600,rollupOptions:{output:{manualChunks:{react:['react','react-dom','lucide-react'],maplibre:['maplibre-gl']}}}}});
