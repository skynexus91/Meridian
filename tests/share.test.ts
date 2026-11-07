import {it,expect} from 'vitest';
import {socialHtml,escapeHtml} from '../server/share';
it('escapes source text before inserting social metadata',()=>{expect(escapeHtml('<script>"&')).toBe('&lt;script&gt;&quot;&amp;');expect(socialHtml('<head><title>Old</title></head>')).toContain('property="og:title"');expect(socialHtml('<head><title>Old</title></head>')).toContain('Meridian — România în direct');});
