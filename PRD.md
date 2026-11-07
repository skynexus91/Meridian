# Meridian Romania — Product Requirements Document

Status: DRAFT  
Updated: 6 November 2026  
App: React/Vite + MapLibre GL JS, Fastify API, SQLite/WAL  
Scope: Romania-only v1 (all Ukraine references removed)

## 1. Product direction

A public, mobile-friendly map for understanding what is happening in Romania: local and national news, public cameras, radio, civil air traffic, road conditions, Danube traffic, weather and satellite weather imagery.

Promise: **Choose a place. See what changed. Explore the evidence.**

Romania is the complete v1 geographic scope. Europe-wide coverage is v2. International publishers can supply stories about Romania without expanding the map's supported coverage. Do not market the product as complete surveillance, an emergency warning service, or a source of verified battlefield intelligence.

Primary audiences: residents of Romania, diaspora following home, and people following Romanian local events. Secondary audience: journalists who need attributable local context and shareable event pages.

## 2. Core experience

Visitors can browse without an account. Start with a Romania overview and offer My Places views. Search supports Romanian diacritics, common transliterations, and English. English and Romanian UI ship first. Preserve original article language; label machine translations.

Desktop: map in the center, filters/news list beside it, event details in a drawer, time controls below, persistent radio player. Mobile: map/list switch and bottom-sheet details. Map layers use progressive disclosure; do not enable every layer on first load.

Default layers: grouped news and official warnings. One click enables weather, cameras, aircraft, roads, ships, or radio locations. Layer availability, timestamps and attribution are always accessible. "Live" means recent observations according to that source's published cadence; forecasts and delayed observations have separate labels.

Follow places locally in the browser without signup. On returning, show changes since the previous visit, new local stories and updates to followed events. Saved radio stations also persist locally. Cross-device accounts and push/email delivery are later work.
