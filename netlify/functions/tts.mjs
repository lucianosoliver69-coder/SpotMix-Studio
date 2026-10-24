import {voices} from '../../shared/voices.mjs';
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
export default async (request)=>{
  if(request.method!=='POST')return json({error:'Método não permitido'},405);
  const key=process.env.GEMINI_API_KEY;
  if(!key)return json({error:'A chave Gemini ainda não foi configurada na Netlify.'},503);
  let input;try{input=await request.json()}catch{return json({error:'JSON inválido'},400)}
  const transcript=String(input.text||'').trim();
  if(!transcript||[...transcript].length>1000)return json({error:'O texto deve ter de 1 a 1000 caracteres.'},400);
  if(!voices.some(v=>v.id===input.voiceId))return json({error:'Locutor inválido.'},400);
  const model=process.env.GEMINI_TTS_MODEL||'gemini-3.8-flash-tts';
  const payload={contents:[{role:'user',parts:[{text:transcript,speech_metadata:{style:'Locução comercial brasileira clara, expressiva e natural'}}]}],generationConfig:{responseModalities:['AUDIO'],speechConfig:{voiceConfig:{voice:input.voiceId},languageCode:'pt-BR'}}};
  try{
    const upstream=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,{method:'POST',headers:{'content-type':'application/json','x-goog-api-key':key},body:JSON.stringify(payload),signal:AbortSignal.timeout(55000)});
    if(!upstream.ok){console.error('Gemini TTS:',upstream.status,await upstream.text());return json({error:`Não foi possível gerar a locução (Google: ${upstream.status}). Verifique o modelo, a chave e o acesso à voz.`},502)}
    const result=await upstream.json();const part=result.candidates?.[0]?.content?.parts?.find(p=>p.inlineData?.data);
    if(!part)return json({error:'A API não retornou áudio.'},502);
    return json({mimeType:part.inlineData.mimeType||'audio/wav',audio:part.inlineData.data});
  }catch(error){console.error('TTS failed:',error);return json({error:'Falha de comunicação com a API de voz.'},502)}
};
