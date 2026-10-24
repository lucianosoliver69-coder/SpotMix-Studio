import {test} from 'node:test';
import assert from 'node:assert/strict';
import handler from '../netlify/functions/tts.mjs';
import {voices} from '../shared/voices.mjs';

test('catalog contains all unique supplied voices',()=>{
  assert.equal(voices.length,75);
  assert.equal(new Set(voices.map(v=>v.id)).size,75);
  assert.equal(voices[0].id,'voice_dpl9452bd9hd');
});

test('voice request validates input without contacting Google',async()=>{
  process.env.GEMINI_API_KEY='test-only';
  const response=await handler(new Request('https://example.com/api/tts',{method:'POST',body:JSON.stringify({text:'Olá',voiceId:'unknown'})}));
  assert.equal(response.status,400);
});

test('voice request sends documented Gemini 3.8 fields',async()=>{
  process.env.GEMINI_API_KEY='test-only';
  const previous=globalThis.fetch;
  let sent;
  globalThis.fetch=async (url,options)=>{sent={url,options};return new Response(JSON.stringify({candidates:[{content:{parts:[{inlineData:{mimeType:'audio/wav',data:'UklGRg=='}}]}}]}),{status:200})};
  try{
    const response=await handler(new Request('https://example.com/api/tts',{method:'POST',body:JSON.stringify({text:'Olá',voiceId:voices[0].id})}));
    assert.equal(response.status,200);
    const payload=JSON.parse(sent.options.body);
    assert.equal(payload.generationConfig.speechConfig.voiceConfig.voice,voices[0].id);
    assert.equal(payload.contents[0].parts[0].speech_metadata.style.includes('brasileira'),true);
    assert.equal(sent.options.headers['x-goog-api-key'],'test-only');
  }finally{globalThis.fetch=previous;delete process.env.GEMINI_API_KEY}
});
