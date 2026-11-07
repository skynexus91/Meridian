import {localCoverage} from '../src/localCoverage.js';
import {places} from './places.js';
import pages from './camera-pages.json' with {type:'json'};
import type {Source,Station,Camera} from '../src/types.js';
type Entry=[string,string,string,string,string?];
const ro:Entry[]=[['digi24','Digi24','tv','https://www.digi24.ro','https://www.digi24.ro/rss'],['hotnews','HotNews','newspaper','https://hotnews.ro','https://hotnews.ro/feed'],['g4media','G4Media','newspaper','https://www.g4media.ro','https://www.g4media.ro/feed'],['tvr','TVR Info','tv','https://tvrinfo.ro','https://tvrinfo.ro/feed'],['europafm','Europa FM','radio','https://www.europafm.ro','https://www.europafm.ro/feed'],['rri','Radio România Internațional','radio','https://www.rri.ro','https://www.rri.ro/en/feed'],['economedia','Economedia','newspaper','https://economedia.ro','https://economedia.ro/feed'],['b365','B365 · București','newspaper','https://b365.ro','https://b365.ro/feed'],['cluj24','Cluj24','newspaper','https://cluj24.ro','https://cluj24.ro/feed'],['ct100','Constanța 100%','newspaper','https://www.ct100.ro','https://www.ct100.ro/feed'],['tulcea','Tulcea Noastră','newspaper','https://www.tulceanoastra.ro','https://www.tulceanoastra.ro/feed'],['actualmm','ActualMM · Maramureș','newspaper','https://actualmm.ro','https://actualmm.ro/feed'],['iasi','Ziarul de Iași','newspaper','https://www.ziaruldeiasi.ro','https://www.ziaruldeiasi.ro/rss'],['galati','Viața Liberă · Galați','newspaper','https://www.viata-libera.ro','https://www.viata-libera.ro/?format=feed&type=rss'],['suceava','Monitorul de Suceava','newspaper','https://www.monitorulsv.ro'],['agerpres','AGERPRES','agency','https://agerpres.ro'],['mediafax','Mediafax','agency','https://www.mediafax.ro'],['protv','Știrile ProTV','tv','https://stirileprotv.ro'],['anm','ANM · weather warnings','official','https://www.meteoromania.ro/vremea/avertizari/'],['infotrafic','Poliția Română · INFOTRAFIC','official','https://www.politiaromana.ro/ro/info-trafic']];
ro.find(r=>r[0]==='galati')![4]='https://www.viata-libera.ro/eveniment?format=feed&type=rss';
ro.push(['radiotop','Radio Top · Suceava','radio','https://www.radiotop.ro','https://www.radiotop.ro/feed/'],['newsbucovina','News Bucovina · Suceava','newspaper','https://www.newsbucovina.ro','https://www.newsbucovina.ro/feed']);
ro.push(
 ['turdanews','TurdaNews · Turda și Câmpia Turzii','newspaper','https://turdanews.net','https://turdanews.net/feed/'],
 ['refleqt','RefleqtMedia · Câmpia Turzii','newspaper','https://www.refleqtmedia.ro','https://www.refleqtmedia.ro/feed/'],
 ['gherla','Gherla INFO · Gherla și comunele învecinate','newspaper','https://gherlainfo.ro','https://gherlainfo.ro/feed/'],
 ['alba24','Alba24 · Alba','newspaper','https://alba24.ro','https://alba24.ro/feed/']
);
ro.push(
['dej24', 'Dej24 · Dej', 'newspaper', 'https://dej24.ro', 'https://dej24.ro/feed/'],
['bistriteanul', 'Bistrițeanul · Bistrița-Năsăud', 'newspaper', 'https://www.bistriteanul.ro', 'https://www.bistriteanul.ro/feed/'],
['turnulsfatului', 'Turnul Sfatului · Sibiu', 'newspaper', 'https://www.turnulsfatului.ro', 'https://www.turnulsfatului.ro/feed/'],
['botosaninews', 'BotoșaniNews', 'newspaper', 'https://www.botosaninews.ro', 'https://www.botosaninews.ro/feed/'],
['observatorph', 'Observatorul Prahovean', 'newspaper', 'https://www.observatorulph.ro', 'https://www.observatorulph.ro/feed/'],
['fagaras', 'Bună Ziua Făgăraș', 'newspaper', 'https://www.bunaziuafagaras.ro', 'https://www.bunaziuafagaras.ro/feed/'],
['vrancea', 'Monitorul de Vrancea', 'newspaper', 'https://www.monitoruldevrancea.ro', 'https://www.monitoruldevrancea.ro/feed/'],
['saceleanul', 'Săceleanul · Săcele', 'newspaper', 'https://saceleanul.ro', 'https://saceleanul.ro/feed/']
);
ro.push(['unirea','Ziarul Unirea · Alba','newspaper','https://ziarulunirea.ro','https://ziarulunirea.ro/feed/'],['ziaruldesalaj','Ziarul de Sălaj','newspaper','https://www.ziaruldesalaj.ro','https://www.ziaruldesalaj.ro/feed/']);
ro.push(
['opiniatimisoarei', 'Opinia Timișoarei · Timiș', 'newspaper', 'https://www.opiniatimisoarei.ro', 'https://www.opiniatimisoarei.ro/feed/'],
['expressbanat', 'Express de Banat · Caraș-Severin', 'newspaper', 'https://expressdebanat.ro', 'https://expressdebanat.ro/feed/'],
['ziarulbacau', 'Ziarul de Bacău · Bacău', 'newspaper', 'https://ziaruldebacau.ro', 'https://ziaruldebacau.ro/feed/'],
['desteptarea', 'Deșteptarea · Bacău', 'newspaper', 'https://www.desteptarea.ro', 'https://www.desteptarea.ro/feed/'],
['vremeanoua', 'Vremea Nouă · Vaslui', 'newspaper', 'https://www.vremeanoua.ro', 'https://www.vremeanoua.ro/feed/'],
['monitorulbt', 'Monitorul de Botoșani · Botoșani', 'newspaper', 'https://www.monitorulbt.ro', 'https://www.monitorulbt.ro/feed/'],
['obiectivbraila', 'Obiectiv Vocea Brăilei · Brăila', 'newspaper', 'https://obiectivbr.ro', 'https://obiectivbr.ro/feed/'],
['gorjeanul', 'Gorjeanul · Gorj', 'newspaper', 'https://www.gorjeanul.ro', 'https://www.gorjeanul.ro/feed/'],
['ziarulvalcea', 'Ziarul de Vâlcea · Vâlcea', 'newspaper', 'https://ziaruldevalcea.ro', 'https://ziaruldevalcea.ro/feed/'],
['gazetadambovitei', 'Gazeta Dâmboviței · Dâmbovița', 'newspaper', 'https://www.gazetadambovitei.ro', 'https://www.gazetadambovitei.ro/feed/'],
['incomod', 'Ziarul Incomod · Prahova', 'newspaper', 'https://www.ziarulincomod.ro', 'https://www.ziarulincomod.ro/feed/'],
['newsbv', 'NewsBV · Brașov', 'newspaper', 'https://www.newsbv.ro', 'https://www.newsbv.ro/feed/']
);
ro.push(
['gds', 'Gazeta de Sud · Dolj', 'newspaper', 'https://www.gds.ro', 'https://www.gds.ro/feed/'],
['specialarad', 'Special Arad · Arad', 'newspaper', 'https://specialarad.ro', 'https://specialarad.ro/feed/'],
['informatiahr', 'Informația Harghitei · Harghita', 'newspaper', 'https://informatiahr.ro', 'https://informatiahr.ro/feed/'],
['mesagerulcovasna', 'Mesagerul de Covasna · Covasna', 'newspaper', 'https://mesageruldecovasna.ro', 'https://mesageruldecovasna.ro/feed/'],
['jurnalularges', 'Jurnalul de Argeș · Argeș', 'newspaper', 'https://jurnaluldearges.ro', 'https://jurnaluldearges.ro/feed/']
);
export const sources:Source[]=[...ro.map(r=>[r,'RO'] as const)].map(([[id,name,type,url,feed],country])=>({id,name,localities:localCoverage[id],additionalFeeds:id==='turdanews'?['https://turdanews.net/articole/rural/feed/']:undefined,type:type as Source['type'],url,feed,country,enabled:!!feed,language:id==='rri'?'en':'ro',rights:feed?'Public RSS headline/link evaluation. Full text, images and commercial redistribution are not enabled.':'Official-site link only; connector/rights not approved.'}));
type StationRow=[string,string,'RO',string,string,number,number,string,Station['genre']];
const stationRows:StationRow[]=[
['rractual', 'Radio România Actualități', 'RO', 'National', 'București', 44.43, 26.1, 'https://www.romania-actualitati.ro/', 'news'],
['europa', 'Europa FM', 'RO', 'National', 'București', 44.43, 26.1, 'https://www.europafm.ro/asculta-live/', 'news'],
['digifm', 'Digi FM', 'RO', 'National', 'București', 44.43, 26.1, 'https://www.digifm.ro/live', 'news'],
['rfi', 'RFI România', 'RO', 'National', 'București', 44.43, 26.1, 'https://www.rfi.fr/ro/', 'news'],
['bucfm', 'București FM', 'RO', 'București', 'București', 44.43, 26.1, 'https://www.bucurestifm.ro/', 'news'],
['rcluj', 'Radio Cluj', 'RO', 'Cluj', 'Cluj-Napoca', 46.77, 23.62, 'https://www.radiocluj.ro/', 'news'],
['riasi', 'Radio Iași', 'RO', 'Iași', 'Iași', 47.16, 27.6, 'https://www.radioiasi.ro/', 'news'],
['rconst', 'Radio Constanța', 'RO', 'Constanța', 'Constanța', 44.16, 28.63, 'https://www.radioconstanta.ro/', 'news'],
['rtim', 'Radio Timișoara', 'RO', 'Timiș', 'Timișoara', 45.75, 21.21, 'https://www.radiotimisoara.ro/', 'news'],
['rcultural', 'Radio România Cultural', 'RO', 'National', 'București', 44.43, 26.1, 'https://www.radioromaniacultural.ro/', 'culture'],
['kiss', 'Kiss FM', 'RO', 'National', 'București', 44.43, 26.1, 'https://www.kissfm.ro/', 'music']
];
export const stations:Station[]=stationRows.map(([id,name,country,region,city,lat,lon,url,genre])=>({id,name,country,region,city,lat,lon,url,genre,rights:'Official player link. Direct playback awaits operator-approved HTTPS stream configuration.'}));
export const cameras:Camera[]=[
  {
    "id": "sinaia-mountain",
    "name": "Sinaia · mountain weather",
    "place": "Sinaia",
    "lat": 45.331,
    "lon": 25.563,
    "url": "https://webcamromania.ro/webcam-partii-de-schi/webcam-sinaia/",
    "country": "RO",
    "status": "Official player",
    "rights": "Webcam România · player oficial. Localizare aproximativă."
  },
  {
    "id": "sinaia-2000",
    "name": "Sinaia · Cota 2000",
    "place": "Sinaia",
    "lat": 45.331,
    "lon": 25.563,
    "url": "https://webcamromania.ro/webcam-partii-de-schi/webcam-live-partia-sinaia-parcare/",
    "country": "RO",
    "status": "Official player",
    "rights": "Webcam România · player oficial. Localizare aproximativă."
  },
  {
    "id": "predeal",
    "name": "Predeal · DN1",
    "place": "Predeal",
    "lat": 45.503,
    "lon": 25.574,
    "url": "https://webcamromania.ro/partii-predeal/",
    "country": "RO",
    "status": "Official player",
    "rights": "Webcam România · player oficial. Localizare aproximativă."
  },
  {
    "id": "busteni",
    "name": "Bușteni · town view",
    "place": "Bușteni",
    "lat": 45.415,
    "lon": 25.537,
    "url": "https://webcamromania.ro/webcam-munte/webcam-orasul-busteni/",
    "country": "RO",
    "status": "Official player",
    "rights": "Webcam România · player oficial. Localizare aproximativă."
  },
  {
    "id": "poiana",
    "name": "Poiana Brașov · mountain weather",
    "place": "Poiana Brașov",
    "lat": 45.594,
    "lon": 25.552,
    "url": "https://webcamromania.ro/webcam-partii-de-schi/webcam-poiana-brasov/",
    "country": "RO",
    "status": "Official player",
    "rights": "Webcam România · player oficial. Localizare aproximativă."
  }
];

const centres:Record<string,[number,number]>={
 'Poiana Brașov':[45.59,25.55],'Păltiniș':[45.65,23.93],Straja:[45.32,23.24],'Vama Veche':[43.75,28.57],'Arieșeni – Vârtop':[46.51,22.67],'Bâlea Lac':[45.60,24.62],'Vatra Dornei':[47.35,25.36],'Bușteni':[45.41,25.53],'Transalpina Ski Resort – Voineasa':[45.42,23.69],'București':[44.43,26.10],'Borșa':[47.65,24.66],'Câmpulung Moldovenesc':[47.53,25.56],'Masivul Ceahlău':[46.98,25.95],Suceava:[47.65,26.26],Mamaia:[44.24,28.62],Eforie:[44.05,28.64],'Cârlibaba':[47.58,25.12],'Toplița':[46.92,25.35],'Gura Humorului':[47.55,25.89],'Brașov':[45.66,25.60],Predeal:[45.50,25.58],Sulina:[45.16,29.65]
};
for(const page of pages){
 const match=places.find(p=>p.country==='RO' && p.name===page.place && p.name!==p.region);
 const centre=centres[page.place]??(match?[match.lat,match.lon]:undefined);
 if(page.place==="Spania"||cameras.some(c=>c.url===page.url))continue;
 cameras.push({...page,id:page.url.slice('https://webcamromania.ro/'.length),country:'RO',lat:centre?.[0],lon:centre?.[1],status:'Official player',rights:'Webcam România · player oficial. Localizare aproximativă.'});
}

const radioStreams:Record<string,string>={
 rtim:'https://stream4.srr.ro:8443/timisoara-fm',
 rfi:'https://asculta.radiorfi.ro/live.mp3',
 rractual:'https://stream4.srr.ro:8443/romania-actualitati',
 europa:'https://astreaming.edi.ro:8443/EuropaFM_aac',
 digifm:'https://edge76.rcs-rds.ro/digifm/digifm.mp3',
 bucfm:'https://stream4.srr.ro:8443/bucuresti-fm',
 rcluj:'https://stream4.srr.ro:8443/radio-cluj',
 riasi:'https://stream4.srr.ro:8443/radio-iasi-fm',
 rconst:'https://stream4.srr.ro:8443/radio-constanta-fm',
 rcultural:'https://stream4.srr.ro:8443/romania-cultural',
 kiss:'https://live.kissfm.ro/kissfm.aacp'
};
for(const station of stations){
 if(radioStreams[station.id]){station.stream=radioStreams[station.id];station.rights='Flux public al postului. Redare directă de la operator, fără retransmitere sau înregistrare.';}
}
