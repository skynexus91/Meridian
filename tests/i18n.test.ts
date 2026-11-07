import {describe,it,expect} from 'vitest';
import {translate} from '../src/i18n';
describe('interface localization',()=>{
 it('translates principal flows in Romanian only',()=>{expect(translate('ro','Public cameras')).toBe('Camere publice');expect(translate('ro','2D map')).toBe('Hartă 2D');expect(translate('ro','Official weather warnings')).toBe('Avertizări meteo oficiale');});
 it('localizes relative time while preserving original publisher text',()=>{expect(translate('ro','15m ago')).toBe('acum 15 min');expect(translate('ro','A unique original article headline')).toBe('A unique original article headline');});
});
