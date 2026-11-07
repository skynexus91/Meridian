import type {Place} from '../src/types.js';
const rows:[string,string,string,number,number,string][] = [
['Bucharest', 'RO', 'București', 44.4268, 26.1025, 'București|Bucuresti|Bucharest'],
['Turda', 'RO', 'Cluj', 46.566, 23.784, ''],
['Câmpia Turzii', 'RO', 'Cluj', 46.548, 23.884, 'Câmpiei Turzii'],
['Mihai Viteazu', 'RO', 'Cluj', 46.54, 23.74, ''],
['Câmpenești', 'RO', 'Cluj', 46.86, 23.7, ''],
['Gherla', 'RO', 'Cluj', 47.03, 23.91, ''],
['Iclod', 'RO', 'Cluj', 46.98, 23.8, ''],
['Fizeșu Gherlii', 'RO', 'Cluj', 47.02, 23.98, ''],
['Nicula', 'RO', 'Cluj', 47.0, 23.94, ''],
['Săcălaia', 'RO', 'Cluj', 46.96, 23.93, ''],
['Aiud', 'RO', 'Alba', 46.31, 23.72, ''],
['Blaj', 'RO', 'Alba', 46.18, 23.92, ''],
['Cluj-Napoca', 'RO', 'Cluj', 46.7712, 23.6236, 'Cluj|Kolozsvár'],
['Iași', 'RO', 'Iași', 47.1585, 27.6014, 'Iasi|Jassy'],
['Constanța', 'RO', 'Constanța', 44.1598, 28.6348, 'Constanta'],
['Tulcea', 'RO', 'Tulcea', 45.178, 28.805, ''],
['Galați', 'RO', 'Galați', 45.4353, 28.008, 'Galati'],
['Suceava', 'RO', 'Suceava', 47.6514, 26.2556, ''],
['Baia Mare', 'RO', 'Maramureș', 47.6573, 23.5681, 'Maramures|Maramureș'],
['Sighetu Marmației', 'RO', 'Maramureș', 47.929, 23.886, 'Sighet'],
['Brașov', 'RO', 'Brașov', 45.6579, 25.6012, 'Brasov'],
['Timișoara', 'RO', 'Timiș', 45.7489, 21.2087, 'Timisoara'],
['Oradea', 'RO', 'Bihor', 47.0465, 21.9189, ''],
['Sibiu', 'RO', 'Sibiu', 45.7983, 24.1256, ''],
['Craiova', 'RO', 'Dolj', 44.3302, 23.7949, ''],
['Ploiești', 'RO', 'Prahova', 44.9367, 26.0129, 'Ploiesti'],
['Pitești', 'RO', 'Argeș', 44.8565, 24.8692, 'Pitesti'],
['Brăila', 'RO', 'Brăila', 45.2692, 27.9575, 'Braila'],
['Bacău', 'RO', 'Bacău', 46.567, 26.9146, 'Bacau'],
['Botoșani', 'RO', 'Botoșani', 47.748, 26.669, 'Botosani'],
['Piatra Neamț', 'RO', 'Neamț', 46.927, 26.37, 'Piatra Neamt'],
['Alba Iulia', 'RO', 'Alba', 46.067, 23.58, ''],
['Arad', 'RO', 'Arad', 46.1866, 21.3123, ''],
['Sinaia', 'RO', 'Prahova', 45.331, 25.563, ''],
['Sulina', 'RO', 'Tulcea', 45.156, 29.654, ''],
['Siret', 'RO', 'Suceava', 47.953, 26.073, ''],
['Isaccea', 'RO', 'Tulcea', 45.27, 28.46, ''],
['Satu Mare', 'RO', 'Satu Mare', 47.79, 22.88, ''],
['Târgu Mureș', 'RO', 'Mureș', 46.54, 24.56, 'Targu Mures'],
['Deva', 'RO', 'Hunedoara', 45.88, 22.9, '']
];
rows.push(['Bistrița','RO','Bistrița-Năsăud',47.133,24.496,'Bistrita'],['Buzău','RO','Buzău',45.15,26.82,'Buzau'],['Reșița','RO','Caraș-Severin',45.3,21.89,'Resita'],['Călărași','RO','Călărași',44.2,27.33,'Calarasi'],['Sfântu Gheorghe','RO','Covasna',45.86,25.79,'Sfantu Gheorghe|Sepsiszentgyörgy'],['Târgoviște','RO','Dâmbovița',44.93,25.46,'Targoviste'],['Giurgiu','RO','Giurgiu',43.9,25.97,''],['Târgu Jiu','RO','Gorj',45.03,23.27,'Targu Jiu'],['Miercurea Ciuc','RO','Harghita',46.36,25.8,'Csíkszereda'],['Slobozia','RO','Ialomița',44.56,27.36,''],['Buftea','RO','Ilfov',44.56,25.95,''],['Otopeni','RO','Ilfov',44.55,26.07,''],['Drobeta-Turnu Severin','RO','Mehedinți',44.64,22.66,'Drobeta|Turnu Severin'],['Slatina','RO','Olt',44.43,24.37,''],['Zalău','RO','Sălaj',47.18,23.06,'Zalau'],['Alexandria','RO','Teleorman',43.97,25.33,''],['Vaslui','RO','Vaslui',46.64,27.73,''],['Râmnicu Vâlcea','RO','Vâlcea',45.1,24.37,'Ramnicu Valcea'],['Focșani','RO','Vrancea',45.7,27.19,'Focsani']);
rows.push(['Dej','RO','Cluj',47.14,23.87,'Dejului'],['Făgăraș','RO','Brașov',45.84,24.97,'Făgărașului'],['Săcele','RO','Brașov',45.62,25.70,'Săcelele'],['Avrig','RO','Sibiu',45.73,24.38,''],['Cisnădie','RO','Sibiu',45.71,24.15,''],['Huedin','RO','Cluj',46.87,23.02,'']);
rows.push(
['Petreștii de Jos', 'RO', 'Cluj', 46.59, 23.64, ''],
['Petreștii de Sus', 'RO', 'Cluj', 46.55, 23.64, ''],
['Moldovenești', 'RO', 'Cluj', 46.5, 23.66, ''],
['Săndulești', 'RO', 'Cluj', 46.58, 23.73, ''],
['Tureni', 'RO', 'Cluj', 46.63, 23.7, ''],
['Tritenii de Jos', 'RO', 'Cluj', 46.59, 24.0, ''],
['Ceanu Mare', 'RO', 'Cluj', 46.66, 23.95, ''],
['Frata', 'RO', 'Cluj', 46.7, 24.05, ''],
['Ciurila', 'RO', 'Cluj', 46.65, 23.55, ''],
['Iara', 'RO', 'Cluj', 46.55, 23.52, ''],
['Valea Ierii', 'RO', 'Cluj', 46.64, 23.35, ''],
['Aiton', 'RO', 'Cluj', 46.68, 23.73, ''],
['Cășeiu', 'RO', 'Cluj', 47.18, 23.87, ''],
['Cuzdrioara', 'RO', 'Cluj', 47.16, 23.93, ''],
['Mintiu Gherlii', 'RO', 'Cluj', 47.05, 23.95, ''],
['Sântimbru', 'RO', 'Alba', 46.13, 23.65, ''],
['Coșlariu', 'RO', 'Alba', 46.16, 23.65, ''],
['Cricău', 'RO', 'Alba', 46.17, 23.57, ''],
['Șimleu Silvaniei', 'RO', 'Sălaj', 47.23, 22.8, ''],
['Jibou', 'RO', 'Sălaj', 47.26, 23.25, ''],
['Hida', 'RO', 'Sălaj', 47.08, 23.3, ''],
['Creaca', 'RO', 'Sălaj', 47.2, 23.25, ''],
['Șercaia', 'RO', 'Brașov', 45.83, 25.13, ''],
['Voila', 'RO', 'Brașov', 45.82, 24.84, ''],
['Șelimbăr', 'RO', 'Sibiu', 45.77, 24.19, '']
);
export const places:Place[]=rows.map(([name,country,region,lat,lon,alias])=>({id:`${country.toLowerCase()}-${name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-')}`,name,country:country as 'RO',region,lat,lon,aliases:alias.split('|').filter(Boolean)}));
export const normalize=(s:string)=>s.normalize('NFD').replace(/([a-zA-Z])[\u0300-\u036f]+/g,'$1').normalize('NFC').toLowerCase();
export function searchPlaces(q:string){const term=normalize(q);return places.filter(p=>[p.name,p.region,...p.aliases].some(n=>normalize(n).includes(term))).slice(0,20);}
export function locate(title:string,country:'RO'):Place|undefined{
 const text=normalize(title); const hits=places.filter(p=>p.country===country&&[p.name,...p.aliases].some(alias=>{const term=normalize(alias);const start=text.indexOf(term);if(start<0)return false; const before=text[start-1]??' ';const after=text[start+term.length]??' ';return !/[\p{L}\p{N}]/u.test(before)&&(!/[\p{L}\p{N}]/u.test(after)||/[іїь]$/u.test(term));}));
 // Multiple localities are ambiguous. Keep the article country-level rather than guessing.
 return hits.length===1?hits[0]:undefined;
}
