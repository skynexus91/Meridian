CREATE TABLE IF NOT EXISTS telemetry_logs (
 batch_id BLOB PRIMARY KEY CHECK(length(batch_id) = 16),
 received_min INTEGER NOT NULL,
 payload BLOB NOT NULL CHECK(length(payload) BETWEEN 7 AND 7168 AND length(payload) % 7 = 0)
) STRICT, WITHOUT ROWID;
CREATE INDEX IF NOT EXISTS telemetry_logs_received ON telemetry_logs(received_min);

CREATE TABLE IF NOT EXISTS search_history (
 device_id BLOB NOT NULL CHECK(length(device_id) = 16),
 query TEXT NOT NULL CHECK(length(query) BETWEEN 1 AND 180),
 last_used_min INTEGER NOT NULL,
 uses INTEGER NOT NULL DEFAULT 1 CHECK(uses > 0),
 lon_e6 INTEGER CHECK(lon_e6 BETWEEN -180000000 AND 180000000),
 lat_e6 INTEGER CHECK(lat_e6 BETWEEN -85000000 AND 85000000),
 PRIMARY KEY(device_id, query),
 CHECK((lon_e6 IS NULL) = (lat_e6 IS NULL))
) STRICT, WITHOUT ROWID;
CREATE INDEX IF NOT EXISTS search_history_recent ON search_history(device_id, last_used_min DESC);

CREATE TABLE IF NOT EXISTS cached_route_pois (
 cell TEXT PRIMARY KEY,
 checked_min INTEGER NOT NULL,
 payload BLOB NOT NULL
) STRICT, WITHOUT ROWID;
CREATE INDEX IF NOT EXISTS cached_route_pois_checked ON cached_route_pois(checked_min);
