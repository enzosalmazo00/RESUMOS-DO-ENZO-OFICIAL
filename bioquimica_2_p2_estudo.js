
(function(){
"use strict";
const facts=window.BIO2P2_FACTS||[];
const groups=[
{key:"lip",name:"Lipídios",es:"Lípidos",title:["Digestão, transporte, mobilização e síntese de gorduras","Digestión, transporte, movilización y síntesis de grasas"],icons:["Sais biliares","Lipase + colipase","Micelas","Enterócito","ApoB-48","Quilomícron / linfa","LPL / tecidos"],iconsES:["Sales biliares","Lipasa + colipasa","Micelas","Enterocito","ApoB-48","Quilomicrón / linfa","LPL / tejidos"],chapters:[["Digestão e emulsificação","Digestión y emulsificación"],["Absorção e montagem de quilomícrons","Absorción y formación de quilomicrones"],["Transporte lipoproteico e mobilização adiposa","Transporte lipoproteico y movilización adiposa"],["Lipogênese e regulação","Lipogénesis y regulación"],["Beta-oxidação e rendimento do palmitato","Beta-oxidación y rendimiento del palmitato"]]},
{key:"aa",name:"Aminoácidos",es:"Aminoácidos",title:["Destino do nitrogênio e dos esqueletos carbônicos","Destino del nitrógeno y esqueletos carbonados"],icons:["Aminoácidos","Transaminação","Glutamato","NH₄⁺ / glutamina","CPS-I / OTC","Ureia"],iconsES:["Aminoácidos","Transaminación","Glutamato","NH₄⁺ / glutamina","CPS-I / OTC","Urea"],chapters:[["Transaminações e PLP","Transaminaciones y PLP"],["Transporte do nitrogênio","Transporte del nitrógeno"],["Ciclo da ureia: matriz e citosol","Ciclo de urea: matriz y citosol"],["Custos energéticos e esqueletos carbônicos","Costos energéticos y esqueletos carbonados"],["Integração clínica e hiperamonemia","Integración clínica e hiperamonemia"]]},
{key:"krebs",name:"Krebs",es:"Krebs",title:["Compreenda cada enzima, cada carbono e cada cofator","Comprenda cada enzima, cada carbono y cada cofactor"],icons:[],iconsES:[],chapters:[["Entrada e rearranjo de carbono","Entrada y reorganización del carbono"],["NADH e descarboxilações","NADH y descarboxilaciones"],["Fosforilação em nível de substrato","Fosforilación a nivel de sustrato"],["Complexo II e regeneração","Complejo II y regeneración"],["Integração energética e regulação","Integración energética y regulación"]]},
{key:"ox",name:"Fosforilação oxidativa",es:"Fosforilación oxidativa",title:["Da transferência de elétrons à síntese de ATP","Del transporte electrónico a la síntesis de ATP"],icons:["NADH / FADH₂","I / II","Q","III","Citocromo c","IV + O₂","Gradiente H⁺","ATP sintase"],iconsES:["NADH / FADH₂","I / II","Q","III","Citocromo c","IV + O₂","Gradiente H⁺","ATP sintasa"],chapters:[["Complexos I e II","Complejos I y II"],["Coenzima Q, III e citocromo c","Coenzima Q, III y citocromo c"],["Oxigênio, complexo IV e gradiente","Oxígeno, complejo IV y gradiente"],["Quimiosmose e ATP sintase","Quimiosmosis y ATP sintasa"],["Inibidores, desacopladores e hipóxia","Inhibidores, desacoplantes e hipoxia"]]}
];
const isES=()=>document.documentElement.lang==="es-PY";
const tr=(p,e)=>isES()?e:p;
const esc=t=>String(t).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function factParagraph(f){
 const pt=esc(f.pt).replace("___",'<strong class="enzo-term">'+esc(f.a)+"</strong>");
 const es=esc(f.es).replace("___",'<strong class="enzo-term">'+esc(f.ae)+"</strong>");
 return '<li><p>'+tr(pt,es)+'</p><span>'+esc(tr(f.why,f.whye))+'</span></li>';
}
function diagram(g){
 if(g.key==="krebs")return "";
 const steps=(isES()?g.iconsES:g.icons);
 let nodes=steps.map((n,i)=>'<div class="enzo-path-step"><span class="enzo-path-index">'+String(i+1).padStart(2,"0")+'</span><b>'+esc(n)+'</b></div>').join('<span class="enzo-path-arrow" aria-hidden="true">→</span>');
 if(g.key==="ox"){
  return '<div class="enzo-pathway"><div class="enzo-path-title">'+tr("TRANSPORTE DE ELÉTRONS · MEMBRANA MITOCONDRIAL INTERNA","TRANSPORTE DE ELECTRONES · MEMBRANA MITOCONDRIAL INTERNA")+'</div><div class="enzo-membrane-wrap"><div class="enzo-h-space">'+tr("ESPAÇO INTERMEMBRANA: H⁺ elevado","ESPACIO INTERMEMBRANA: H⁺ elevado")+' <strong>↑ H⁺</strong></div><div class="enzo-membrane"><div class="enzo-complex">I <small>4 H⁺</small></div><div class="enzo-complex">II <small>0 H⁺</small></div><div class="enzo-complex">III <small>4 H⁺</small></div><div class="enzo-complex">IV <small>2 H⁺</small></div><div class="enzo-complex enzo-atp">V <small>ATP</small></div></div><div class="enzo-matrix">'+tr("MATRIZ: NADH → I • succinato/FAD → II • Q → III → citocromo c → IV → O₂ / H₂O • H⁺ retorna via V","MATRIZ: NADH → I • succinato/FAD → II • Q → III → citocromo c → IV → O₂ / H₂O • H⁺ retorna por V")+'</div></div><div class="enzo-path-flow">'+nodes+'</div></div>';
 }
 return '<div class="enzo-pathway"><div class="enzo-path-title">'+tr("MAPA DO PROCESSO — SIGA DA ESQUERDA PARA A DIREITA","MAPA DEL PROCESO — SIGA DE IZQUIERDA A DERECHA")+'</div><div class="enzo-path-flow">'+nodes+'</div></div>';
}
function renderAll(){
 for(const g of groups){
  const target=document.getElementById(g.key);
  if(!target)continue;
  let holder=target.querySelector(".enzo-deep-index");
  if(!holder){holder=document.createElement("div");holder.className="enzo-deep-index";target.querySelector(".container").appendChild(holder)}
  const current=facts.filter(f=>f.c===g.name);
  const partitions=[current.slice(0,5),current.slice(5,10),current.slice(10,15),current.slice(15,20),current.slice(20,25)];
  let html='<div class="enzo-deep-intro"><span>'+tr("APROFUNDAMENTO | HARPER + LEHNINGER","PROFUNDIZACIÓN | HARPER + LEHNINGER")+'</span><h2>'+tr(g.title[0],g.title[1])+'</h2><p>'+tr("Explicação do mecanismo, com pergunta-chave e justificativa para fixação. Cada conceito também faz parte do banco de flashcards e questões.","Explicación del mecanismo con pregunta clave y justificación. Cada concepto también integra las tarjetas y las preguntas.")+'</p></div>';
  html+=diagram(g);
  partitions.forEach((items,idx)=>{
   html+='<article class="enzo-deep"><span class="enzo-deep-number">'+tr("ETAPA DE ESTUDO","ETAPA DE ESTUDIO")+' '+(idx+1)+'/5</span><h3>'+esc(tr(g.chapters[idx][0],g.chapters[idx][1]))+'</h3><ol class="enzo-concept-list">';
   items.forEach(f=>{html+=factParagraph(f)});
   html+='</ol><div class="enzo-deep-tip">'+tr("Ponto de prova: explique o substrato, a enzima e o produto antes de memorizar.","Punto de examen: explique sustrato, enzima y producto antes de memorizar.")+'</div></article>';
  });
  if(g.key==="krebs"){
   html+='<div class="enzo-krebs-integracao"><strong>'+tr("Saldo por volta de acetil-CoA","Balance por vuelta de acetil-CoA")+'</strong><div><span>3 NADH</span><span>1 FADH₂</span><span>1 GTP</span><span>2 CO₂</span><span>≈10 ATP</span></div><p>'+tr("As duas moléculas de CO₂ liberadas na primeira volta não precisam corresponder aos dois carbonos do acetil-CoA recém-incorporado. O oxaloacetato é regenerado.","Las dos moléculas de CO₂ liberadas en la primera vuelta no tienen que corresponder a los dos carbonos del acetil-CoA recién incorporado. El oxaloacetato se regenera.")+'</p></div>';
  }
  holder.innerHTML=html;
 }
 const introductions=[["Lipídios","Lípidos","Digestão, absorção, lipólise, lipogênese e beta-oxidação","Digestión, absorción, lipólisis, lipogénesis y beta-oxidación"],["Aminoácidos","Aminoácidos","Transaminação, glutamato e ciclo da ureia","Transaminación, glutamato y ciclo de urea"],["Ciclo de Krebs","Ciclo de Krebs","Oito reações: produtos, enzimas, energia e controle","Ocho reacciones: productos, enzimas, energía y control"],["Fosforilação oxidativa","Fosforilación oxidativa","Cadeia respiratória, força próton-motriz e ATP sintase","Cadena respiratoria, fuerza protón-motriz y ATP sintasa"]];
document.querySelectorAll("#topicCards .intro-card").forEach((card,i)=>{const v=introductions[i];if(!v)return;const title=card.querySelector(".ic-name"),desc=card.querySelector(".ic-desc");if(title)title.textContent=tr(v[0],v[1]);if(desc)desc.textContent=tr(v[2],v[3]);});
document.querySelectorAll("#quiz .q-stats .sbox .sl").forEach((n,i)=>{const lbl=[["Corretas","Correctas"],["Incorretas","Incorrectas"],["Pendentes","Pendientes"]][i];if(lbl)n.textContent=tr(lbl[0],lbl[1]);});
const fcintro=document.querySelector("#flashcards .info-block p");if(fcintro)fcintro.textContent=tr("Responda mentalmente antes de virar o cartão. Use os filtros para revisar cada tema ou embaralhe para integrar as vias metabólicas.","Responda antes de girar la tarjeta. Use filtros por tema o mezcle los conceptos para integrar las vías metabólicas.");
const fbintro=document.querySelector("#flashcards .info-block h4");if(fbintro)fbintro.textContent=tr("124 cartões com explicações e reações","124 tarjetas con explicaciones y reacciones");
document.querySelectorAll("nav.tabs [data-section]").forEach(b=>{
 const section=b.dataset.section;
 const label={intro:["📖 Início","📖 Inicio"],lip:["🧬 Lipídios","🧬 Lípidos"],aa:["🔬 Aminoácidos","🔬 Aminoácidos"],krebs:["🔄 Ciclo de Krebs","🔄 Ciclo de Krebs"],ox:["⚡ Fosforilação oxidativa","⚡ Fosforilación oxidativa"],flashcards:["🃏 Flashcards","🃏 Tarjetas"],quiz:["📝 Questões","📝 Preguntas"]}[section];
 if(label)b.textContent=tr(label[0],label[1]);
 });
 document.querySelectorAll("#flashcards .chapter-title").forEach(x=>x.textContent="🃏 "+tr("Flashcards — Bioquímica II P2","Tarjetas — Bioquímica II P2"));
 document.querySelectorAll("#quiz .study-tools label").forEach(x=>{if(x.htmlFor==="qCategory")x.textContent=tr("Tema","Tema");if(x.htmlFor==="qType")x.textContent=tr("Tipo","Tipo")});
 document.querySelectorAll("#flashcards .study-tools label").forEach(x=>{if(x.htmlFor==="fcFilter")x.textContent=tr("Tema","Tema");if(x.htmlFor==="fcSearch")x.textContent=tr("Buscar","Buscar")});
 const reset=document.querySelector("#quiz .reset-btn");if(reset)reset.textContent=tr("↻ Reiniciar simulado","↻ Reiniciar simulacro");
 const shuf=document.querySelector("#flashcards button[onclick*='shuffleFlashcards']");if(shuf)shuf.textContent=tr("⇄ Embaralhar","⇄ Mezclar");
 const logo=document.querySelector("header .badge");if(logo)logo.textContent="BIOQUÍMICA II · P2 · 2026";
 const header=document.querySelector("header p.sub");if(header)header.textContent=tr("Lipídios · Aminoácidos · Ciclo de Krebs · Fosforilação oxidativa","Lípidos · Aminoácidos · Ciclo de Krebs · Fosforilación oxidativa");
 const headerBy=document.querySelector("header p.by");if(headerBy)headerBy.textContent=tr("Elaborado por Enzo Salmazo · Material interativo para revisão","Elaborado por Enzo Salmazo · Material interactivo de repaso");
 const foot=document.querySelector("footer");if(foot)foot.textContent=tr("Bioquímica II — P2 · 100 conceitos · 124 flashcards · 100 questões · Harper, Lehninger e slides das aulas","Bioquímica II — P2 · 100 conceptos · 124 tarjetas · 100 preguntas · Harper, Lehninger y diapositivas");
 if(window.BioKrebsCycle)window.BioKrebsCycle.draw();
}
const prev=window.enzoLang;
window.enzoLang=function(es){prev(es);renderAll()};
renderAll();
})();