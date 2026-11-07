import {describe,it,expect} from 'vitest';
import {pickVoice} from '../server/voice';
describe('voice selection',()=>{
 it('maps each worldwide language family to a calm neural voice',()=>{
  for(const lang of ['en','ro','de','fr','zh','ar','hi','ja','pt','ru','sw'])
   expect(pickVoice(lang)).toMatch(/^[a-z]{2}-[A-Za-z]{2}-[A-Za-z0-9]+Neural$/);
 });
 it('falls back to English when the language is unknown or regional',()=>{
  expect(pickVoice('xx')).toBe('en-US-AnaNeural');
  expect(pickVoice('')).toBe('en-US-AnaNeural');
  expect(pickVoice('ro-RO')).toBe('ro-RO-AlinaNeural');
 });
});
