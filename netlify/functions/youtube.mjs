const json=(error,status)=>new Response(JSON.stringify({error}),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
export function videoId(input){
  let url;try{url=new URL(input)}catch{return null}
  const host=url.hostname.toLowerCase();
  let id=null;
  if(['youtube.com','www.youtube.com','m.youtube.com'].includes(host)){
    if(url.pathname==='/watch')id=url.searchParams.get('v');
    else if(/^\/(shorts|live)\//.test(url.pathname))id=url.pathname.split('/')[2];
  }else if(['youtu.be','www.youtu.be'].includes(host))id=url.pathname.slice(1).split('/')[0];
  return /^[A-Za-z0-9_-]{11}$/.test(id||'')?id:null;
}
export function audioLink(input,allowedHosts='*.ytjar.xyz'){
  let url;try{url=new URL(input)}catch{return null}
  const hosts=allowedHosts.split(',').map(host=>host.trim().toLowerCase()).filter(Boolean),hostname=url.hostname.toLowerCase();
  const allowed=hosts.some(pattern=>pattern.startsWith('*.')?(hostname===pattern.slice(2)||hostname.endsWith('.'+pattern.slice(2))):hostname===pattern);
  if(url.protocol!=='https:'||url.username||url.password||url.port||!allowed)return null;
  return url;
}
export default async request=>{
  if(request.method!=='POST')return json('Método não permitido.',405);
  let input;try{input=await request.json()}catch{return json('Envie um JSON válido.',400)}
  const id=videoId(input.url);if(!id)return json('Link do YouTube inválido.',400);
  if(!['mp3','wav'].includes(input.format))return json('Escolha MP3 ou WAV.',400);
  const key=process.env.RAPIDAPI_KEY;
  if(!key)return json('Configure RAPIDAPI_KEY nas variáveis de ambiente da Netlify.',503);
  const provider=new URL('https://youtube-mp36.p.rapidapi.com/dl');
  provider.searchParams.set('id',id);
  try{
    const response=await fetch(provider,{method:'GET',headers:{'x-rapidapi-host':'youtube-mp36.p.rapidapi.com','x-rapidapi-key':key},signal:AbortSignal.timeout(55000)});
    if(!response.ok){console.error('YouTube converter:',response.status);return json(`O serviço de conversão falhou (${response.status}).`,502)}
    let audioResponse=response;
    const type=response.headers.get('content-type')||'';
    if(type.includes('json')){
      const data=await response.json();
      if(data.status!=='ok'||!data.link)return json(data.msg||'O serviço ainda não retornou um link de áudio. Tente novamente.',502);
      const link=audioLink(data.link,process.env.YOUTUBE_CONVERTER_AUDIO_HOSTS||'*.ytjar.xyz');
      if(!link){let host='desconhecido';try{host=new URL(data.link).hostname}catch{}return json(`O serviço retornou um host de áudio não autorizado: ${host}.`,502)}
      audioResponse=await fetch(link,{redirect:'manual',signal:AbortSignal.timeout(45000)});
      if(!audioResponse.ok)return json(`O arquivo de áudio não pôde ser baixado (${audioResponse.status}).`,502);
    }
    const audioType=audioResponse.headers.get('content-type')||'';
    if(!audioType.startsWith('audio/')&&!audioType.includes('octet-stream'))return json('O serviço não retornou áudio. Verifique o contrato da API.',502);
    return new Response(audioResponse.body,{headers:{'content-type':audioType,'content-disposition':`attachment; filename="youtube-${id}.mp3"`,'cache-control':'no-store'}});
  }catch(error){console.error('YouTube converter failed:',error);return json('Falha de comunicação com o serviço de conversão.',502)}
};
