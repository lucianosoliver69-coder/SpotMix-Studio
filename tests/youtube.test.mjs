import {test} from 'node:test';
import assert from 'node:assert/strict';
import convert,{videoId} from '../netlify/functions/youtube.mjs';

test('accepts standard YouTube links and rejects lookalike hosts',()=>{
  const id='dQw4w9WgXcQ';
  assert.equal(videoId('https://www.youtube.com/watch?v='+id),id);
  assert.equal(videoId('https://youtu.be/'+id),id);
  assert.equal(videoId('https://youtube.com.evil.example/watch?v='+id),null);
  assert.equal(videoId('http://127.0.0.1/watch?v='+id),null);
});

test('reports unconfigured converter without claiming download succeeded',async()=>{
  delete process.env.YOUTUBE_CONVERTER_API_URL;
  const response=await convert(new Request('https://example.com/api/youtube',{method:'POST',body:JSON.stringify({url:'https://youtu.be/dQw4w9WgXcQ',format:'mp3'})}));
  assert.equal(response.status,503);
  assert.match((await response.json()).error,/não foi conectada/);
});
