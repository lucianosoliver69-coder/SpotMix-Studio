const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
const instructions={
  corrigir:'Corrija somente ortografia, acentuação, pontuação e gramática. Preserve informações, sentido, preços, nomes e tom. Retorne apenas o texto corrigido.',
  formatar:'Formate como roteiro de locução comercial, com pontuação e quebras de linha naturais. Preserve todas as informações e palavras essenciais. Retorne apenas o roteiro.',
  gerar:'Crie um spot comercial curto e objetivo em português do Brasil usando as informações fornecidas. Não invente preços, prazos, endereços, descontos ou condições. Retorne apenas o texto do spot.'
};
export default async request=>{
  if(request.method!=='POST')return reply({error:'Método não permitido'},405);
  const key=process.env.GEMINI_API_KEY;if(!key)return reply({error:'A chave Gemini ainda não foi configurada na Netlify.'},503);
  let input;try{input=await request.json()}catch{return reply({error:'JSON inválido'},400)}
  const mode=input.mode,source=String(input.text||'').trim();
  if(!instructions[mode])return reply({error:'Ação inválida.'},400);
  if(!source||[...source].length>1000)return reply({error:'Digite de 1 a 1000 caracteres para usar a IA.'},400);
  const model=process.env.GEMINI_TEXT_MODEL||'gemini-2.5-flash';
  try{
    const response=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,{method:'POST',headers:{'content-type':'application/json','x-goog-api-key':key},body:JSON.stringify({systemInstruction:{parts:[{text:instructions[mode]+' Limite: 1000 caracteres de saída.'}]},contents:[{role:'user',parts:[{text:source}]}],generationConfig:{temperature:mode==='gerar'?.7:.2}}),signal:AbortSignal.timeout(25000)});
    if(!response.ok){console.error('Gemini text:',response.status,await response.text());return reply({error:`A IA de texto falhou (Google: ${response.status}).`},502)}
    const data=await response.json(),result=data.candidates?.[0]?.content?.parts?.map(p=>p.text||'').join('').trim();
    if(!result)return reply({error:'A IA não retornou texto.'},502);
    return reply({text:[...result].slice(0,1000).join('')});
  }catch(error){console.error('Text AI failed:',error);return reply({error:'Falha de comunicação com a IA.'},502)}
};
