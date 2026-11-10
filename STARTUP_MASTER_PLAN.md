# MASTER PRODUCTION DOCUMENT: PROJECT MERIDIAN ROMANIA
## Alignment of Business Strategy, Investor Pitch, and Product Architecture
## Targeted for AI Coding Agents & LLM Processing

---

## I. EXECUTIVE BUSINESS STRATEGY (LEAN BUSINESS PLAN)

### 1. Value Proposition
Meridian is a map-first navigation ecosystem that unifies route guidance with real-time regional context. Instead of just drawing a navigation line, it aggregates live public infrastructure data, weather hazards, automated traffic bulletins, webcam feeds, and multimodal tracking (aviation/maritime) into a single mobile-first viewport.

### 2. Market Segmentation (TAM, SAM, SOM)
*   **TAM (Total Addressable Market):** Global users of digital navigation and intelligent road assistance software.
*   **SAM (Serviceable Addressable Market):** Commercial drivers, logistics couriers, and road travelers in the Central and Eastern Europe (CEE) region who depend on local weather hazards and official road bulletins.
*   **SOM (Serviceable Obtainable Market):** Professional drivers, light-logistics fleets, and regional tech enthusiasts in Romania who require consolidated, timestamped national traffic data (INFOTRAFIC/Police) and real-time transit telemetry on a unified screen.

### 3. Lean Financial Model & Monetization
Operated as a Solo Developer tech stack, structural costs are minimized to pure API consumption and baseline compute. Monetization uses a dual-engine B2C/B2B framework:
*   **Free Tier (B2C):** Full global routing using MapLibre GL JS and OpenStreetMap data layers. Access to baseline public feeds (Local News, InfoTrafic, Public Webcams).
*   **Premium Tier (B2C Subscription - €2.99/month):** Unlocks advanced map layers (Google Streets/Satellite), automated route-based weather alerts, and live TomTom traffic flow tiles.
*   **Data as a Service Tier (B2B API):** Cleansed, geo-parsed, and administrative-validated event feeds exposed as a structured API for local micro-logistics fleets.

---

## II. PITCH DECK STRUCTURE (INVESTOR READINESS)

*   **Slide 1: Vision & Hook**
    *   *Core Message:* Meridian Romania – Choose a place. See what changed. Explore the evidence of the road.
*   **Slide 2: The Problem**
    *   Legacy navigation tools (Google Maps, Waze) operate in information silos. Commercial and regional drivers must context-switch between 4 to 5 disconnected applications to check real-time mountain pass weather, official police road closures, public traffic webcams, and localized transit alerts.
*   **Slide 3: The Solution**
    *   A high-performance, map-first architecture that layers location-based context directly over the map canvas. Features built-in text-to-speech for hands-free local article ingestion and dynamic bottom sheets for immediate regional awareness.
*   **Slide 4: Product & Current Traction**
    *   The MVP is fully operational on local infrastructure. It features global auto-routing, street-level GPS tracking, multi-provider weather fetching, automated parsing of official road bulletins, and a responsive mobile-first UI.
*   **Slide 5: Technical Moat (Solo-Dev Agility)**
    *   Built without enterprise database overhead. The entire backend runs within a micro-instance footprint (GCP Free Tier e2-micro) by utilizing Fastify paired with SQLite in Write-Ahead Logging (WAL) mode. Operating costs scale horizontally only with paid API consumption.
*   **Slide 6: Go-To-Market (GTM) Strategy**
    *   Hyper-targeted distribution through digital infrastructure monitoring groups, regional transport forums, and open-source tech communities by marketing the transparent "Solo Developer vs. Tech Monopolies" narrative.
*   **Slide 7: Financial Projections**
    *   Structural burn rate is near-zero during the validation phase. Breakeven point is mathematically isolated at just 150 active premium subscribers to cover commercial API operational thresholds.
*   **Slide 8: Competitive Landscape**
    *   Waze targets hyper-local urban gridlocks; TomTom targets enterprise automotive hardware contracts. Meridian captures the missing layer: aggregating regional public utilities, multimodal telemetry, and weather tracking for mid-to-long range transit.
*   **Slide 9: The Execution Matrix**
    *   1 Solo Developer + AI-Engineered Stack (Cursor, Copilot, Fastify automation). Zero organizational friction, continuous deployment pipelines, and rapid feature iteration.
*   **Slide 10: The Ask**
    *   Capital allocation strictly for securing advanced commercial keys (TomTom Traffic Flow, AISStream Enterprise tier, Open-Meteo commercial scale), establishing the corporate legal framework, and executing targeted customer acquisition campaigns for the native mobile rollout.

---

## III. PRODUCT REQUIREMENTS DOCUMENT (PRD) & TECHNICAL SPECIFICATIONS

### 1. Architectural Blueprint
*   **Frontend Core:** React 19, Vite, MapLibre GL JS, TypeScript, Mobile-First Native Responsive CSS.
*   **Backend Core:** Fastify, TypeScript, SQLite with WAL (Write-Ahead Logging) persistent storage engine (`/data/meridian.db`).
*   **Asset Pipeline:** Single Page Application (SPA) static asset distribution with explicit wildcard matching enabled (`wildcard:true`) to prevent MIME-type delivery degradation on deployment targets.

### 2. Feature Implementation Matrix

| Module Name | Core Infrastructure Provider | Current Status | Production Hardening Requirement |
| :--- | :--- | :--- | :--- |
| **Navigation & Routing** | MapLibre GL JS / OpenStreetMap / Photon | Implemented | Inject frontend GPS update throttling to preserve mobile device batteries. |
| **Traffic Intelligence** | INFOTRAFIC Bulletins / TomTom Flow Tiles | Implemented (Bulletins) | Bind production TomTom commercial token for map tile hydration. |
| **Weather Processing** | Open-Meteo API / MET Norway Failback | Implemented | Enforce server-side SQLite API response caching middleware. |
| **Mobile Deployment** | Web SPA / Responsive Viewport Layout | Implemented | Wrapper initialization via CapacitorJS for Google Play deployment. |
| **Administration Engine**| Token-based Endpoint Protection (`ADMIN_TOKEN`) | Implemented | Transition from static environment variable to dynamic secret vaulting. |

### 3. Production Deployment Code Snippets

#### A. Fastify Server-Side SQLite Caching Middleware
This production-grade module intercepts outbound requests to high-cost or rate-limited external REST services (such as Open-Meteo or TomTom), persisting JSON strings directly inside the database.

```typescript
import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import fp from 'fastify-plugin';

interface CacheRow {
  value: string;
  expires_at: number;
}

async function fastifySqliteCache(fastify: FastifyInstance, options: FastifyPluginOptions) {
  // Database table initialization verification query:
  // CREATE TABLE IF NOT EXISTS api_cache (key TEXT PRIMARY KEY, value TEXT, expires_at INTEGER);

  fastify.decorate('setApiCache', async (key: string, value: any, ttlSeconds: number) => {
    const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds;
    const stringifiedValue = JSON.stringify(value);
    
    await (fastify as any).db.run(
      `INSERT OR REPLACE INTO api_cache (key, value, expires_at) VALUES (?, ?, ?)`,
      [key, stringifiedValue, expiresAt]
    );
  });

  fastify.decorate('getApiCache', async (key: string): Promise<any | null> => {
    const now = Math.floor(Date.now() / 1000);
    
    const row = await (fastify as any).db.get(
      `SELECT value FROM api_cache WHERE key = ? AND expires_at > ?`,
      [key, now]
    );

    if (row) {
      return JSON.parse(row.value);
    }
    
    (fastify as any).db.run(`DELETE FROM api_cache WHERE expires_at <= ?`, [now]).catch(() => {});
    return null;
  });
}

export default fp(fastifySqliteCache, { name: 'fastify-sqlite-cache' });
```

#### B. CapacitorJS Android Native Build Strategy
To execute a headless integration of the React 19 single-page-application layout directly into an Android `.aab` (Android App Bundle) binary, run the following compilation sequence:

```bash
# 1. Update Vite configuration file to build with relative asset path mappings
# Ensure vite.config.ts contains: base: './'

# 2. Build production assets into the /dist directory
npm run build

# 3. Initialize the native Capacitor ecosystem wrapper
npm install @capacitor/core @capacitor/cli
npx cap init Meridian "com.skynexus91.meridian" --web-dir=dist

# 4. Bind the Android build platform layer
npm install @capacitor/android
npx cap add android

# 5. Inject required hardware GPS parameters into android/app/src/main/AndroidManifest.xml
# Add these definitions inside the XML manifest tree:
<!-- <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" /> -->
<!-- <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" /> -->
<!-- <uses-permission android:name="android.permission.INTERNET" /> -->

# 6. Synchronize web assets to native runtime environment
npx cap sync android
```

### 4. Security & Production Hardening Directives
1.  **Google Maps API Domain Restrictions:** Secure `VITE_GOOGLE_MAPS_BROWSER_KEY` via the Google Cloud Console. Set an HTTP Referrer restriction matching the production Web URL to prevent unauthorized script injections.
2.  **MIME-Type Asset Flow Integrity:** Maintain `wildcard:true` in the `fastifyStatic` registration schema. This ensures browser engines loading the React 19 app compiled assets interpret scripts in `/assets/*.js` correctly as JavaScript, avoiding index.html fallbacks.
3.  **Data Durability Protocols:** Implement an active system-level crontab to execute hot-backups of the SQLite binary from `data/meridian.db` to encrypted remote target paths every 24 hours.
