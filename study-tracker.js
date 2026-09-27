/* study-tracker.js
   Carregado automaticamente por auth-guard.js nas páginas protegidas.
   Grava somente o progresso do próprio usuário via RLS.
*/
(function(){
"use strict";
window.EnzoStudyTracker={
start:function(client,session,pageKey){
 if(!client||!session?.user||!pageKey)return;
 var key=String(pageKey),path=(location.pathname||"").toLowerCase();
 if(/dashboard|admin|professor|conta|progresso/.test(path))return;
 var type=key.startsWith("curso-")?"curso":key.startsWith("aulao-")?"aulao":"resumo";
 var uid=session.user.id,rowId=null,start=Date.now(),maxProgress=0,saving=false,lastSave=0;
 function section(){try{var nodes=[...document.querySelectorAll("h1,h2,h3,.section-title,.topic-title,.tab-title,[data-section-title]")],best=null;nodes.forEach(el=>{var r=el.getBoundingClientRect();if(r.top<=180&&r.bottom>-80)best=el});var t=best?(best.innerText||best.textContent||""):(document.title||key);return t.replace(/\s+/g," ").trim().slice(0,180)}catch{return(document.title||key).slice(0,180)}}
 function pos(){var d=document.documentElement,max=Math.max(0,Math.max(d.scrollHeight,document.body?.scrollHeight||0)-innerHeight),y=Math.max(0,scrollY||d.scrollTop||0),pct=max?Math.min(100,Math.max(0,y/max*100)):0;return{y:Math.round(y),pct:Math.round(pct*100)/100}}
 async function ensure(){if(rowId)return;try{var r=await client.from("study_sessions").insert({user_id:uid,product_key:key,product_type:type,started_at:new Date(start).toISOString(),page_url:location.pathname+location.search,metadata:{title:document.title||null}}).select("id").single();if(!r.error&&r.data)rowId=r.data.id}catch{}}
 async function save(force){if(saving)return;var now=Date.now();if(!force&&now-lastSave<12000)return;saving=true;lastSave=now;try{var p=pos();maxProgress=Math.max(maxProgress,p.pct);var done=maxProgress>=95;await client.from("study_progress").upsert({user_id:uid,product_key:key,product_type:type,progress_percent:Math.round(maxProgress*100)/100,last_section:section(),last_position:{scroll_y:p.y,scroll_percent:p.pct},last_url:location.pathname+location.search,last_opened_at:new Date().toISOString(),completed:done,completed_at:done?new Date().toISOString():null,updated_at:new Date().toISOString()},{onConflict:"user_id,product_key"});await ensure();if(rowId)await client.from("study_sessions").update({ended_at:new Date().toISOString(),duration_seconds:Math.max(0,Math.round((Date.now()-start)/1000))}).eq("id",rowId)}catch(e){console.warn("[study-tracker]",e)}finally{saving=false}}
 (async()=>{try{var r=await client.from("study_progress").select("progress_percent").eq("user_id",uid).eq("product_key",key).maybeSingle();if(!r.error&&r.data)maxProgress=Number(r.data.progress_percent||0)}catch{}ensure();setTimeout(()=>save(true),1200)})();
 var timer=null;addEventListener("scroll",()=>{clearTimeout(timer);timer=setTimeout(()=>save(false),900)},{passive:true});setInterval(()=>{if(!document.hidden)save(false)},30000);document.addEventListener("visibilitychange",()=>{if(document.hidden)save(true)});addEventListener("pagehide",()=>save(true));
}}
})();
