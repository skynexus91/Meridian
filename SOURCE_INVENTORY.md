# Source inventory — Romania v1

Research snapshot: 5 November 2026. Review inventory, not a deployed or fully verified feed registry.

Hierarchy: **Country → county/oblast → municipality → source/operator**. Geographic coverage and publisher headquarters are separate fields. National services can cover local events; regional broadcasters may cover several counties. Full municipality-by-municipality enumeration is an onboarding task, not completed research in this draft.

Status legend:

- **D — documented:** official provider page documents a relevant service/feed. Authentication, current payload, quotas, rights and regional coverage still need testing.
- **C — candidate:** named source/site to investigate; no feed, stream permission or integration is asserted.
- **L — licensed/permission route:** plan for agreement/subscription review; do not assume free reuse.

Unless marked D, every entry below is C. Links are discovery/home pages, not invented API endpoints. A documented RSS service does not grant unrestricted reuse of full text, images, translations or audio.

## 1. Shared transport, weather and discovery providers

| Layer | Provider and evidence | Status | Proposed use / remaining gate |
|---|---|---|---|
| Civil aviation | [adsb.lol API](https://www.adsb.lol/docs/open-data/api) | D | Primary feasibility candidate; ODbL obligations, quota, Romanian coverage and Ukraine gaps need assessment |
| Civil aviation alternative | [OpenSky API](https://opensky-network.org/data/api), [terms](https://opensky-network.org/about/terms-of-use) | D/L | Published terms require written licensing for operational API use; not the default free production fallback |
| Vessel positions | [AISStream documentation](https://www.aisstream.io/documentation/) | D | Server-side AIS subscription; API key, redistribution/retention terms and Black Sea/Danube reception need validation |
| Maritime alternatives | [MarineTraffic](https://www.marinetraffic.com/), [VesselFinder](https://www.vesselfinder.com/) | L | Commercial API/partnership candidates, not website scrapers |
| Road congestion/incidents | [TomTom Traffic API](https://docs.tomtom.com/traffic-api/documentation/tomtom-maps/v1/product-information/introduction) | D/L | Evaluate flow/incident coverage, map compatibility, public display license and budget for each country |
| Road alternative | [HERE](https://www.here.com/) | L | Licensed alternative if fit/coverage is better; do not integrate both by default |
| Official transport discovery | [European Commission NAP directory](https://transport.ec.europa.eu/transport-themes/smart-mobility/road/its-directive-and-action-plan/national-access-points_en) | D | Discover Romanian transport datasets; registry listings are not proof of accessible live feeds |
| Forecasts | [Open-Meteo docs](https://open-meteo.com/en/docs), [terms](https://open-meteo.com/en/terms), [pricing](https://open-meteo.com/en/pricing) | D/L | Point/hourly forecast candidate; free endpoint is noncommercial; commercial service requires subscription |
| Satellite weather | [EUMETSAT EUMETView resources](https://user.eumetsat.int/data-access/eumetview/resources), [viewer](https://view.eumetsat.int/) | D | Visible/infrared weather products; inspect WMS capabilities, time frames, product terms and display limits |
| Radar | [RainViewer API](https://www.rainviewer.com/api.html), [map API](https://www.rainviewer.com/api/weather-maps-api.html) | D | Evaluate permitted use, attribution and actual Romanian/Ukrainian coverage; not a guaranteed commercial source |
| European warnings fallback | [Meteoalarm](https://www.meteoalarm.org/) | C | Assess distribution/API and country participation before use; national authorities remain named sources |
| Station discovery | [Radio Browser API](https://api.radio-browser.info/) | D | Discover by country/language/tags; community metadata is not permission to rebroadcast; verify with station operator |
| Geography | [OpenStreetMap](https://www.openstreetmap.org/), [INS Romania](https://insse.ro/), [Ukraine open data](https://data.gov.ua/) | C | Administrative gazetteer/boundary sources; validate license and identifiers. OSM public tiles/geocoders are not an unrestricted production backend |
| Humanitarian context | [OCHA ReliefWeb](https://reliefweb.int/), [UNHCR Ukraine](https://www.unhcr.org/ua/), [IOM Ukraine](https://ukraine.iom.int/) | C | Published humanitarian reporting; confirm API/display terms and event precision |

## 2. Romania — national sources

### News agencies, newspapers and digital newsrooms

| Source | Type | Access status / role |
|---|---|---|
| [AGERPRES](https://agerpres.ro/) | National news agency | C/L; investigate public metadata/feed and licensed agency distribution separately |
| [Mediafax](https://www.mediafax.ro/) | Agency/newsroom | C/L; public website does not establish wire rights |
| [Rador Radio România](https://www.rador.ro/) | Radio news agency/monitoring | C/L; assess permitted feeds and licensing |
| [HotNews](https://hotnews.ro/) | Digital national publication | C; RSS discovery/terms check |
| [G4Media](https://www.g4media.ro/) | Digital national publication | C; RSS discovery/terms check |
| [Adevărul](https://adevarul.ro/) | Newspaper/digital | C; national and regional reporting |
| [Libertatea](https://www.libertatea.ro/) | Newspaper/digital | C; national/local reporting |
| [Ziarul Financiar](https://www.zf.ro/) | Business newspaper | C/L; licensed/paywalled content stays linked |
| [Economedia](https://economedia.ro/) | Business/infrastructure publication | C |
| [Recorder](https://recorder.ro/) | Investigative newsroom | C; long-form context, not high-frequency incident feed |
| [PressOne](https://pressone.ro/) | Investigative/public-interest newsroom | C |
| [Romania Insider](https://www.romania-insider.com/) | English-language publication | C/L; diaspora/international context |

### TV newsrooms

| Source | Proposed input | Status |
|---|---|---|
| [Digi24](https://www.digi24.ro/), [RSS](https://www.digi24.ro/rss) | Articles/metadata; TV player only if approved | XML response surfaced by browser retrieval, parser/rights still untested; C for integration |
| [TVR Info](https://tvrinfo.ro/) | Public broadcaster articles | C |
| [Știrile ProTV](https://stirileprotv.ro/) | Newsroom articles | C |
| [Observator](https://observatornews.ro/) | Newsroom articles | C |
| [Antena 3 CNN](https://www.antena3.ro/) | Newsroom articles | C |
| [Euronews România](https://www.euronews.ro/) | Romanian newsroom articles | C; do not assume global Euronews feed covers this edition |

### National radio and station directory

News/talk priorities: [Radio România Actualități](https://www.romania-actualitati.ro/), [Radio România Internațional](https://www.rri.ro/), [Europa FM](https://www.europafm.ro/), [Digi FM](https://www.digifm.ro/), [RFI România](https://www.rfi.fr/ro/).

Broader listening candidates: [Radio România Cultural](https://www.radioromaniacultural.ro/), [Radio România Muzical](https://www.romania-muzical.ro/), [Radio ZU](https://radiozu.ro/), [Kiss FM](https://www.kissfm.ro/), [Rock FM](https://www.rockfm.ro/), [Magic FM](https://www.magicfm.ro/). These support listening, not necessarily event discovery.

Documented discovery evidence: [SRR official station player directory](https://api.srr.ro/stream/playlist.htm) (D), [SRR organization](https://www.srr.ro/) (D), [Europa FM listening instructions](https://www.europafm.ro/cum-asculti-europa-fm/) (D). The [RRI English feed](https://www.rri.ro/en/feed) returned an RSS content type to browser retrieval; payload parsing and usage review remain undone. No listed station has approved in-app stream use yet.

### Official alerts, transport and weather

| Authority | Geography / input | Status |
|---|---|---|
| [Poliția Română INFOTRAFIC](https://www.politiaromana.ro/ro/info-trafic) | National road incidents/closures | C; test current access and republication rules |
| [CNAIR](https://www.cnadnr.ro/), [Romanian NAP](https://nap.cnadnr.ro/) | Highways, roadworks, traffic datasets | C; dataset-level investigation required |
| [ANM warnings](https://www.meteoromania.ro/vremea/avertizari/) | Weather warnings, forecast/radar access discovery | Official warning page confirmed; machine access and usage C |
| [IGSU subordinate units](https://igsu.ro/unitati-subordonate) | National/county emergency announcements | Official directory D; individual connectors C |
| [DSU](https://www.dsu.mai.gov.ro/) | Civil emergency announcements | C; do not assume a public RO-ALERT API exists |
| [INHGA](https://www.hidro.ro/) | Flood/hydrological notices | C |
| [Romanian Naval Authority](https://portal.rna.ro/), [RORIS project](https://portal.rna.ro/proiect/proiect-roris-1/) | Navigational notices/river services | Service existence D; access to live AIS/API is not established |
| [Port of Constanța](https://www.portofconstantza.com/) | Port bulletins/arrivals/departures | C; scheduled/administrative reports, not a substitute for AIS |
| [AFDJ Galați](https://www.afdj.ro/) | Danube navigation/fairway notices | C |
| [Romanian Border Police](https://www.politiadefrontiera.ro/) | Published border notices | C; no invented wait-time feed |
| [Bucharest Airports](https://www.bucharestairports.ro/), [ROMATSA](https://www.romatsa.ro/) | Airport/service notices | C; do not scrape operational restricted systems or equate schedules with aircraft positions |

## 3. Romania — county → municipality discovery list

All 41 counties plus Bucharest are represented below. This is a starting list of named candidate newsrooms, not full coverage or endorsement. For **every row**, also onboard the county council, prefecture, official ISU/IPJ announcements, municipality notices, transit operator and utilities where permitted. Get canonical government URLs from official institutional directories rather than guessed subdomains.

| County / unit | Initial municipality focus | Local press candidates | Regional/local radio candidates |
|---|---|---|---|
| Alba | Alba Iulia, Sebeș | [Alba24](https://alba24.ro/), [Ziarul Unirea](https://ziarulunirea.ro/) | Radio Unirea FM |
| Arad | Arad | [Special Arad](https://specialarad.ro/), [aradon.ro](https://www.aradon.ro/) | Radio Timișoara regional |
| Argeș | Pitești, Câmpulung | [Jurnalul de Argeș](https://jurnaluldearges.ro/) | local station discovery |
| Bacău | Bacău, Onești | [Deșteptarea](https://www.desteptarea.ro/), [Ziarul de Bacău](https://ziaruldebacau.ro/) | Radio Iași regional |
| Bihor | Oradea | [Bihoreanul](https://www.ebihoreanul.ro/), [Bihon](https://www.bihon.ro/) | local station discovery |
| Bistrița-Năsăud | Bistrița | [Bistrițeanul](https://www.bistriteanul.ro/), [Timp Online](https://timponline.ro/) | Radio Cluj regional |
| Botoșani | Botoșani, Dorohoi | [Botoșăneanul](https://www.botosaneanul.ro/), [Știri Botoșani](https://stiri.botosani.ro/) | Radio Iași regional |
| Brașov | Brașov, Făgăraș | [BizBrașov](https://www.bizbrasov.ro/), [Bună Ziua Brașov](https://www.bzb.ro/) | Radio România Brașov FM |
| Brăila | Brăila | [Obiectiv Vocea Brăilei](https://obiectivbr.ro/) | Radio Constanța regional |
| Buzău | Buzău, Râmnicu Sărat | [Reporter Buzoian](https://www.reporterbuzoian.ro/), [Buzoienii](https://www.buzoienii.ro/) | local station discovery |
| Caraș-Severin | Reșița, Caransebeș | [Express de Banat](https://expressdebanat.ro/) | Radio Reșița |
| Călărași | Călărași, Oltenița | [Obiectiv de Călărași](https://obiectiv-online.ro/) | local station discovery |
| Cluj | Cluj-Napoca, Turda | [Monitorul de Cluj](https://www.monitorulcj.ro/), [Cluj24](https://cluj24.ro/) | Radio Cluj |
| Constanța | Constanța, Mangalia | [Ziua de Constanța](https://www.ziuaconstanta.ro/), [CT100](https://www.ct100.ro/) | Radio Constanța, Radio Vacanța |
| Covasna | Sfântu Gheorghe | [CovasnaMedia](https://covasnamedia.ro/) | Radio Târgu Mureș regional |
| Dâmbovița | Târgoviște | [Gazeta Dâmboviței](https://www.gazetadambovitei.ro/) | local station discovery |
| Dolj | Craiova | [Gazeta de Sud](https://www.gds.ro/), [Cuvântul Libertății](https://cvlpress.ro/) | Radio Oltenia Craiova |
| Galați | Galați, Tecuci | [Viața Liberă](https://www.viata-libera.ro/) | regional station discovery |
| Giurgiu | Giurgiu | [Giurgiuveanul](https://giurgiuveanul.ro/) | local station discovery |
| Gorj | Târgu Jiu | [Gorjeanul](https://gorjeanul.ro/), [Pandurul](https://www.pandurul.ro/) | Radio Oltenia Craiova regional |
| Harghita | Miercurea Ciuc, Odorheiu Secuiesc | [Informația Harghitei](https://informatiahr.ro/), [Hargita Népe](https://hargitanepe.ro/) | Radio Târgu Mureș; minority-language discovery |
| Hunedoara | Deva, Hunedoara, Petroșani | [Servus Hunedoara](https://www.servuspress.ro/) | local station discovery |
| Ialomița | Slobozia, Urziceni | [Independent](https://www.independentonline.ro/) | local station discovery |
| Iași | Iași, Pașcani | [Ziarul de Iași](https://www.ziaruldeiasi.ro/), [ReporterIS](https://reporteris.ro/) | Radio Iași, Radio HIT |
| Ilfov | Buftea, Otopeni, Voluntari | [Buletin de București](https://buletin.de/bucuresti/) regional | București FM regional |
| Maramureș | Baia Mare, Sighetu Marmației | [eMaramureș](https://www.emaramures.ro/), [ActualMM](https://actualmm.ro/) | Radio Sighet |
| Mehedinți | Drobeta-Turnu Severin, Orșova | [Actual Mehedinți](https://actualmehedinti.ro/) | Radio Oltenia Craiova regional |
| Mureș | Târgu Mureș, Sighișoara | [Zi de Zi](https://www.zi-de-zi.ro/) | Radio Târgu Mureș |
| Neamț | Piatra Neamț, Roman | [Mesagerul de Neamț](https://mesagerulneamt.ro/), [Monitorul de Neamț](https://monitorulneamt.ro/) | Radio Iași regional |
| Olt | Slatina, Caracal | [Gazeta Nouă](https://www.gazetanoua.ro/) | Radio Oltenia Craiova regional |
| Prahova | Ploiești, Sinaia, Bușteni | [Observatorul Prahovean](https://www.observatorulph.ro/) | local station discovery |
| Satu Mare | Satu Mare, Carei | [PresăSM](https://www.presasm.ro/) | Radio Cluj regional |
| Sălaj | Zalău | [Sălăjeanul](https://www.salajeanul.ro/), [Magazin Sălăjean](https://www.magazinsalajean.ro/) | Radio Cluj regional |
| Sibiu | Sibiu, Mediaș | [Turnul Sfatului](https://www.turnulsfatului.ro/), [Tribuna](https://www.tribuna.ro/) | local station discovery |
| Suceava | Suceava, Rădăuți, Siret | [Monitorul de Suceava](https://www.monitorulsv.ro/), [Obiectiv de Suceava](https://www.obiectivdesuceava.ro/) | Radio Top Suceava, Radio Iași regional |
| Teleorman | Alexandria, Turnu Măgurele | [Liber în Teleorman](https://liberinteleorman.ro/) | local station discovery |
| Timiș | Timișoara, Lugoj | [Opinia Timișoarei](https://www.opiniatimisoarei.ro/), [Pressalert](https://www.pressalert.ro/) | Radio Timișoara |
| Tulcea | Tulcea, Sulina, Isaccea | [Tulcea Noastră](https://www.tulceanoastra.ro/), [Dobrogea Live](https://dobrogealive.ro/) | Radio Constanța regional |
| Vaslui | Vaslui, Bârlad, Huși | [Vremea Nouă](https://www.vremeanoua.ro/) | Radio Iași regional |
| Vâlcea | Râmnicu Vâlcea | [Gazeta Vâlceană](https://www.gazetavalceana.ro/) | Radio Oltenia Craiova regional |
| Vrancea | Focșani | [Ziarul de Vrancea](https://www.ziaruldevrancea.ro/), [Monitorul de Vrancea](https://www.monitorulvn.ro/) | local station discovery |
| București | Bucharest and sectors 1–6 | [B365](https://b365.ro/), [Buletin de București](https://buletin.de/bucuresti/) | București FM, national stations |

Regional station canonical links/streams should be obtained from the [SRR directory](https://www.srr.ro/) and [official player listing](https://api.srr.ro/stream/playlist.htm), not guessed audio endpoints. Regional entries above indicate candidate editorial coverage, not measured FM reception.

Municipality onboarding template: city hall announcements + county-level authorities + two independent local newsrooms where available + transit/road notices + water/power service notices + approved radio + authorized webcam. Launch does not require all components everywhere; display missing coverage clearly.

## 4. Ukraine — national sources (excluded from v1)

No Ukrainian sources are ingested in v1. The service is Romania-only.

## 5. Cameras — Romania first

Discovery: [Webcam România](https://webcamromania.ro/), official municipal tourism sites, ski-area operators, port/tourism operators and official road-camera publishers. A directory is a pointer to an operator, not blanket permission to embed.

Romanian pilot searches: Bucharest civic/tourism views; Brașov/Poiana Brașov and Prahova Valley weather views; Constanța/Mangalia coastal views; Tulcea/Danube tourism views; Cluj/Iași public tourism views. Each camera requires canonical operator link, permission/terms record, location, stream type, observation timestamp if supplied and health check. No camera in this draft is certified available for our app.

Only non-sensitive operator-authorized views may be considered later. Newsroom video links remain source reporting, not an app-owned live camera network.

## 7. International coverage about Romania

[Reuters](https://www.reuters.com/), [AP](https://apnews.com/), [AFP](https://www.afp.com/), [BBC](https://www.bbc.com/), [DW](https://www.dw.com/), [France 24](https://www.france24.com/) and [Euronews](https://www.euronews.com/) are candidates for licensed feeds or permitted metadata/linking. Do not scrape agency wires or full paywalled stories. [Euronews official feed page](https://www.euronews.com/widgets) documents RSS offerings (D); uses remain subject to its terms.

These sources can corroborate/report on Romania without making v1 a continent-wide product. Europe-wide publisher/municipal onboarding begins in v2. [Council of the EU RSS](https://www.consilium.europa.eu/en/about-site/rss/) is documented but deferred unless a specific story materially concerns Romania.

## 8. Source onboarding record and next research work

Required fields: source ID, operator/ownership, source type, country, administrative coverage, city base, language, canonical website, discovered feed/API/player URL, access method, authentication reference (never secret), rights basis, allowed fields/media, cache limits, attribution, quota/cost, expected cadence, sample test date, observed coverage, status and reviewer.

Next research after direction approval:

1. Parse live payloads for the proposed minimum inventory, including Ukrainian-language text, redirects and timestamps; record successful endpoint URLs rather than guessed `/feed` suffixes.
2. Establish display/translation/preview rights. Contact operators only with authorization. Keep permission-pending items disabled or link-only.
3. Measure aircraft/AIS coverage and weather/radar extent across both countries; flag gaps and estimate real production costs.
4. Validate local newsroom domains/current operations, ownership overlap and regional relevance. The long tail above is explicitly unverified.
5. Select allowed radio streams, test HTTPS/playback/geoblocking and establish whether embedding is permitted. A browser can block mixed-content streams even when the station is online.
6. Publish a coverage matrix by country/region/layer with documented, tested, permission-pending, unavailable and live states. Only the last state may be presented as operational coverage.

## 9. Implementation verification update

The approved local evaluation now has a working source registry/health panel. The last completed sample confirmed Romanian responding RSS feeds. This verifies connectivity/parsing, not commercial redistribution rights or exhaustive municipal coverage.

Corrected/discovered endpoints include [Ziarul de Iași](https://www.ziaruldeiasi.ro/rss), [Viața Liberă events](https://www.viata-libera.ro/eveniment?format=feed&type=rss), [Radio Top Suceava](https://www.radiotop.ro/feed/) and [News Bucovina](https://www.newsbucovina.ro/feed). Undated items are explicitly first-seen records, not invented publication dates.

Official weather inputs: [ANM warning RSS](https://www.meteoromania.ro/avertizari-rss.php). Summaries link to the source rather than inventing severity or geometry.

Five Romanian players were selected from publisher-provided embed codes on [Sinaia](https://webcamromania.ro/webcam-partii-de-schi/webcam-sinaia/), [Sinaia Cota 2000](https://webcamromania.ro/webcam-partii-de-schi/webcam-live-partia-sinaia-parcare/), [Predeal](https://webcamromania.ro/partii-predeal/), [Bușteni](https://webcamromania.ro/webcam-munte/webcam-orasul-busteni/) and [Poiana Brașov](https://webcamromania.ro/webcam-partii-de-schi/webcam-poiana-brasov/) pages. The app embeds with attribution, never relays raw streams and does not promise upstream video uptime.

Current coverage, tests and remaining access gates are in [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md) and [TESTING.md](TESTING.md). The original candidate tables remain a discovery backlog.


## Runtime additions, 5 November 2026

TurdaNews includes the dedicated Rural RSS feed at https://turdanews.net/articole/rural/feed/. RefleqtMedia, Gherla INFO, Dej24, Alba24, Ziarul Unirea, Ziarul de Sălaj, Bună Ziua Făgăraș, Turnul Sfatului and Săceleanul expose locality coverage in the application source directory. This is curated coverage, not a guarantee that every locality has a report in every time window.

NASA GIBS capabilities supply product dates, matrix sets and tile URLs for MODIS true colour, NDVI, land-surface temperature, snow, flood composites, OMPS aerosols, OPERA Sentinel-1 surface water and historical Landsat WELD. VIIRS thermal detections link to NASA FIRMS while vector tile access is unavailable.

CelesTrak weather, resource and gps-ops groups provide orbital elements. The displayed catalog is restricted to recognized civilian weather, observation and navigation programs. Positions and regional passages are SGP4 calculations, with element epochs displayed.
