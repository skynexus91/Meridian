import {describe,it,expect} from 'vitest';
import {detectArticleLanguage,extractArticle,publicImage} from '../server/articles';
describe('public article reader',()=>{
 it('detects the article text language independently of the interface locale',()=>{
  const ro='Autoritățile locale au anunțat astăzi măsuri pentru transportul public. '.repeat(5);
  const en='Local authorities announced new measures for public transport today. '.repeat(5);
  expect(detectArticleLanguage(ro)).toBe('ro');expect(detectArticleLanguage(en)).toBe('en');expect(detectArticleLanguage('A short headline')).toBeUndefined();
 });
 it('preserves article text, photos and captions while excluding navigation',()=>{
  const result=extractArticle('<meta property="og:title" content="Știre locală"><meta property="og:image" content="https://publisher.test/cover.jpg"><article><nav><p>Navigation that must be excluded from the reader</p></nav><p>Un paragraf public suficient de lung pentru citirea articolului.</p><figure><img src="/photo.jpg"><figcaption>Fotografie · redacția locală</figcaption></figure></article>','https://publisher.test/story');
  expect(result.image).toBe('https://publisher.test/cover.jpg');expect(result.blocks.some(b=>b.kind==='paragraph')).toBe(true);expect(result.blocks.some(b=>b.src==='https://publisher.test/photo.jpg')).toBe(true);expect(result.blocks.some(b=>b.text.includes('Navigation'))).toBe(false);
 });
 it('returns the public summary when a publisher declares a paywall',()=>{
  const result=extractArticle('<meta name="description" content="Rezumat public"><script type="application/ld+json">{"isAccessibleForFree":false}</script><article><p>Paragrafe restricționate care nu trebuie expuse în cititor.</p></article>','https://publisher.test/story');
  expect(result.restricted).toBe(true);expect(result.blocks).toEqual([{kind:'paragraph',text:'Rezumat public'}]);
 });
 it('rejects local and non-HTTPS image URLs',()=>{
  expect(publicImage('javascript:alert(1)','https://publisher.test')).toBeUndefined();expect(publicImage('https://127.0.0.1/secret','https://publisher.test')).toBeUndefined();
 });
});
