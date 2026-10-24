import {test} from 'node:test';
import assert from 'node:assert/strict';
import convert,{videoId,audioLink} from '../netlify/functions/youtube.mjs';

test('accepts standard YouTube links and rejects lookalike hosts',()=>{
  const id='dQw4w9WgXcQ';
  assert.equal(videoId('https://www.youtube.com/watch?v='+id),id);
  assert.equal(videoId('https://youtu.be/'+id),id);
  assert.equal(videoId('https://youtube.com.evil.example/watch?v='+id),null);
  assert.equal(videoId('http://127.0.0.1/watch?v='+id),null);
});

test('reports unconfigured converter without claiming download succeeded',async()=>{
  delete process.env.RAPIDAPI_KEY;
  const response=await convert(new Request('https://example.com/api/youtube',{method:'POST',body:JSON.stringify({url:'https://youtu.be/dQw4w9WgXcQ',format:'mp3'})}));
  assert.equal(response.status,503);
  assert.match((await response.json()).error,/RAPIDAPI_KEY/);
});

test('accepts provider audio link only from allowed HTTPS host',()=>{
  assert.equal(audioLink('https://cdn02.ytjar.xyz/get.php/audio.mp3?h=abc')?.hostname,'cdn02.ytjar.xyz');
  assert.equal(audioLink('https://cdn19.ytjar.xyz/audio.mp3')?.hostname,'cdn19.ytjar.xyz');
  assert.equal(audioLink('https://eta.123tokyo.xyz/audio.mp3')?.hostname,'eta.123tokyo.xyz');
  assert.equal(audioLink('https://lambda.123tokyo.xyz/audio.mp3')?.hostname,'lambda.123tokyo.xyz');
  assert.equal(audioLink('https://lambda.123tokyo.xyz.evil.example/audio.mp3'),null);
  assert.equal(audioLink('https://cdn02.ytjar.xyz.evil.example/audio.mp3'),null);
  assert.equal(audioLink('http://cdn02.ytjar.xyz/audio.mp3'),null);
});

test('follows successful JSON result and returns audio',async()=>{
  process.env.RAPIDAPI_KEY='test-only';
  const original=globalThis.fetch;let calls=0;
  globalThis.fetch=async(url,options)=>{calls++;if(calls===1){assert.equal(url.toString(),'https://youtube-mp36.p.rapidapi.com/dl?id=dQw4w9WgXcQ');assert.equal(options.method,'GET');assert.equal(options.headers['x-rapidapi-host'],'youtube-mp36.p.rapidapi.com');assert.equal(options.headers['x-rapidapi-key'],'test-only');return new Response(JSON.stringify({status:'ok',link:'https://cdn02.ytjar.xyz/song.mp3'}),{headers:{'content-type':'application/json'}})}return new Response(new Uint8Array([1,2,3]),{headers:{'content-type':'audio/mpeg'}})};
  try{const response=await convert(new Request('https://example.com/api/youtube',{method:'POST',body:JSON.stringify({url:'https://youtu.be/dQw4w9WgXcQ',format:'mp3'})}));assert.equal(response.status,200);assert.equal(response.headers.get('content-type'),'audio/mpeg');assert.equal(calls,2)}finally{globalThis.fetch=original;delete process.env.RAPIDAPI_KEY}
});

test('retries a CDN link that is still processing',async()=>{
  process.env.RAPIDAPI_KEY='test-only';
  const original=globalThis.fetch;let calls=0;
  globalThis.fetch=async()=>{calls++;if(calls===1)return new Response(JSON.stringify({status:'ok',link:'https://eta.123tokyo.xyz/song.mp3'}),{headers:{'content-type':'application/json'}});if(calls===2)return new Response('',{status:404});return new Response(new Uint8Array([1]),{headers:{'content-type':'audio/mpeg'}})};
  try{const response=await convert(new Request('https://example.com/api/youtube',{method:'POST',body:JSON.stringify({url:'https://youtu.be/dQw4w9WgXcQ',format:'mp3'})}));assert.equal(response.status,200);assert.equal(calls,3)}finally{globalThis.fetch=original;delete process.env.RAPIDAPI_KEY}
});
