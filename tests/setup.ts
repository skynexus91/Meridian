import {tmpdir} from 'node:os';
import {join} from 'node:path';

// Tests must never read or write the live provider cache. A fresh database per
// run keeps cached fixtures (speeds, roads, weather) out of the assertions.
process.env.DATABASE_PATH = join(tmpdir(), `meridian-test-${process.pid}.sqlite`);
process.env.TOMTOM_API_KEY = '';
