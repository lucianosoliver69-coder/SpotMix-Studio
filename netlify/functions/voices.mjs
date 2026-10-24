import {voices} from '../../shared/voices.mjs';
export default async ()=>new Response(JSON.stringify(voices),{headers:{'content-type':'application/json; charset=utf-8','cache-control':'public,max-age=3600'}});
