
(function(){
"use strict";
const facts=window.BIO2P2_FACTS||[];
if(facts.length!==100){console.error("Banco Bio II P2 não carregado",facts.length);return;}
const topicOrder=["Lipídios","Aminoácidos","Krebs","Fosforilação oxidativa"];
const langES=()=>document.documentElement.lang==="es-PY";
const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fmt=(p,e)=>langES()?e:p;
const pick=(obj)=>fmt(obj.pt,obj.es);
function alternatives(f,index,es){
 const list=facts.filter(x=>x.c===f.c);
 const current=list.indexOf(f);
 const peers=[...list.slice(Math.floor(current/5)*5,Math.floor(current/5)*5+5),...list];
 const labels=[es?f.ae:f.a];
 for(const item of peers){
  const candidate=es?item.ae:item.a;
  if(!labels.some(s=>s.toLocaleLowerCase()===candidate.toLocaleLowerCase()))labels.push(candidate);
  if(labels.length===4)break;
 }
 const correct=labels[0];
 // varia a posição da alternativa correta: nenhuma letra é privilegiada
 const shift=index%4;
 return {o:labels.slice(1,4).slice(0,shift).concat(correct,labels.slice(1,4).slice(shift)),cr:"ABCD"[shift]};
}
const categories={"Lipídios":"Lipídios","Aminoácidos":"Aminoácidos","Krebs":"Ciclo de Krebs","Fosforilação oxidativa":"Fosforilação oxidativa"};
const bq=facts.map((f,i)=>{
 let t=["mc","mc","tf","gap","tf"][i%5];
 const pt=alternatives(f,i,false),es=alternatives(f,i,true);
 const isFalse=t==="tf" && Math.floor(i/5)%2===1;
 let stmtPT=f.pt.replace("___",isFalse?pt.o.find(x=>x!==f.a):f.a);
 let stmtES=f.es.replace("___",isFalse?es.o.find(x=>x!==f.ae):f.ae);
 // Opções de respostas das perguntas binárias não são usadas
 const question=t==="tf"?"Verdadeiro ou falso: "+stmtPT:(t==="gap"?"Complete a lacuna: ":"Escolha a alternativa correta: ")+f.pt;
 const questionES=t==="tf"?"Verdadero o falso: "+stmtES:(t==="gap"?"Complete el espacio: ":"Seleccione la alternativa correcta: ")+f.es;
 return {n:i+1,t,c:f.c,q:question,qe:questionES,o:pt.o.map((v,j)=>({l:"ABCD"[j],v})),oe:es.o.map((v,j)=>({l:"ABCD"[j],v})),cr:t==="tf"?(isFalse?"F":"V"):pt.cr,crES:es.cr,ex:"Resposta: "+f.a+". "+f.why,exe:"Respuesta: "+f.ae+". "+f.whye,f};
});
QD.splice(0,QD.length,...bq);
const studyCards=facts.map(f=>({c:f.c,q:f.pt,qe:f.es,a:"<strong>"+esc(f.a)+"</strong>. "+esc(f.why),ae:"<strong>"+esc(f.ae)+"</strong>. "+esc(f.whye)}));
(window.BIO2P2_KREBS_STEPS||[]).forEach((k,i)=>{
 studyCards.push({c:"Krebs",q:"Qual enzima catalisa a etapa "+(i+1)+" do Krebs?",qe:"¿Qué enzima cataliza la etapa "+(i+1)+" de Krebs?",a:"<strong>"+esc(k[3])+"</strong>. "+esc(k[5])+" → "+esc(k[0]),ae:"<strong>"+esc(k[4])+"</strong>. "+esc(k[6])+" → "+esc(k[1])});
 studyCards.push({c:"Krebs",q:"Descreva a reação "+(i+1)+" do Krebs.",qe:"Describa la reacción "+(i+1)+" del Krebs.",a:esc(k[8]),ae:esc(k[9])});
 studyCards.push({c:"Krebs",q:"Qual o balanço da reação "+(i+1)+"?",qe:"¿Cuál es el balance de la reacción "+(i+1)+"?",a:"<strong>"+esc(k[7])+"</strong>. "+esc(k[10]),ae:"<strong>"+esc(k[7])+"</strong>. "+esc(k[11])});
});
FC.splice(0,FC.length,...studyCards);
const fcFilter=document.getElementById("fcFilter");
const qType=document.getElementById("qType");
const qCategory=document.getElementById("qCategory");
function resetSelectors(){
 let old=fcFilter.value;
 fcFilter.innerHTML='<option value="">'+fmt("Todos os temas","Todos los temas")+'</option>'+topicOrder.map(c=>'<option value="'+esc(c)+'">'+esc(fmt(categories[c],c==="Lipídios"?"Lípidos":c==="Aminoácidos"?"Aminoácidos":c==="Krebs"?"Ciclo de Krebs":"Fosforilación oxidativa"))+'</option>').join("");
 if(topicOrder.includes(old))fcFilter.value=old;
 old=qCategory.value;
 qCategory.innerHTML=fcFilter.innerHTML;
 if(topicOrder.includes(old))qCategory.value=old;
 old=qType.value;
 qType.innerHTML='<option value="">'+fmt("Todos os tipos","Todos los tipos")+'</option><option value="mc">'+fmt("Múltipla escolha","Opción múltiple")+'</option><option value="tf">'+fmt("Verdadeiro ou falso","Verdadero o falso")+'</option><option value="gap">'+fmt("Completar lacunas","Completar espacios")+'</option>';
 qType.value=["mc","tf","gap"].includes(old)?old:"";
}
window.bioShuffleFlashcards=function(){for(let i=FC.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[FC[i],FC[j]]=[FC[j],FC[i]];}window.renderFlashcards();};
const shufBtn=document.querySelector("#flashcards button[onclick]");
if(shufBtn&&shufBtn.getAttribute("onclick")==="shuffleFlashcards()")shufBtn.setAttribute("onclick","bioShuffleFlashcards()");
const setCounts=()=>{
 document.querySelectorAll("[data-question-count]").forEach(n=>n.textContent=QD.length);
 document.querySelectorAll("[data-flashcard-count]").forEach(n=>n.textContent=FC.length);
 const q=document.querySelector("#quiz .info-block .label"),f=document.querySelector("#flashcards .info-block .label");
 if(q)q.textContent=QD.length+" "+fmt("questões comentadas","preguntas explicadas");
 if(f)f.textContent=FC.length+" "+fmt("cartões de revisão","tarjetas de repaso");
 document.querySelector("#quiz .info-block h4").textContent=fmt("Questões dos slides + Harper e Lehninger","Preguntas de clases + Harper y Lehninger");
 document.querySelector("#quiz .info-block p").textContent=fmt("40 questões de múltipla escolha, 40 verdadeiro/falso e 20 lacunas. Todas com resposta fundamentada e explicação.","40 preguntas de opción múltiple, 40 verdadero/falso y 20 espacios. Cada una con respuesta justificada.");
 document.querySelector("#flashcards .info-block h4").textContent=fmt(FC.length+" conceitos para recuperação ativa",FC.length+" conceptos para recuperación activa");
 document.getElementById("fcSearch").placeholder=fmt("Buscar conceito, enzima ou reação...","Buscar concepto, enzima o reacción...");
 document.querySelector("#quiz .chapter-title").textContent="📝 "+fmt("Simulado de Bioquímica II — P2","Simulacro de Bioquímica II — P2");
};
const originalLang=window.enzoLang;
window.enzoLang=function(es){originalLang(es);resetSelectors();setCounts();window.renderQuiz();window.renderFlashcards();if(window.BioKrebsCycle)window.BioKrebsCycle.show(window.BioKrebsCycle.current);};
window.renderFlashcards=function(){
 const grid=document.getElementById("flashcard-grid");const category=fcFilter.value;
 const term=document.getElementById("fcSearch").value.trim().toLocaleLowerCase();
 const filtered=FC.filter(f=>(!category||category===f.c)&&(!term||(fmt(f.q,f.qe)+" "+fmt(f.a,f.ae)).toLocaleLowerCase().includes(term)));
 grid.innerHTML="";
 for(const f of filtered){
  const el=document.createElement("article");el.className="flashcard";
  el.innerHTML='<div class="flashcard-inner"><div class="flashcard-front"><div class="fc-tag">'+esc(f.c)+'</div><div class="fc-q">'+esc(fmt(f.q,f.qe))+'</div><div class="fc-hint">'+fmt("Clique para virar ↻","Pulse para girar ↻")+'</div></div><div class="flashcard-back"><div class="fc-tag" style="color:var(--green)">'+fmt("Resposta explicada","Respuesta explicada")+'</div><div class="fc-back-text">'+fmt(f.a,f.ae)+'</div></div></div>';
  el.addEventListener("click",()=>el.classList.toggle("flipped"));grid.appendChild(el);
 }
 document.getElementById("fcVisible").textContent=filtered.length+" de "+FC.length+" "+fmt("cartões","tarjetas");
 document.getElementById("fcEmpty").style.display=filtered.length?"none":"block";
};
window.renderQuiz=function(){
 const ct=document.getElementById("quizContainer");
 ct.innerHTML="";
 const label={mc:fmt("Múltipla escolha","Opción múltiple"),tf:fmt("Verdadeiro/Falso","Verdadero/Falso"),gap:fmt("Completar lacuna","Completar espacio")};
 for(let i=0;i<QD.length;i++){
  const q=QD[i];const d=document.createElement("article");d.className="q-card";d.id="q"+i;d.dataset.category=q.c;d.dataset.type=q.t;
  let body="";
  if(q.t==="tf"){
    body='<div class="tf-opts"><button class="tf-btn" data-v="V" onclick="answerTF('+i+',\'V\')">'+fmt("✅ VERDADEIRO","✅ VERDADERO")+'</button><button class="tf-btn" data-v="F" onclick="answerTF('+i+',\'F\')">'+fmt("❌ FALSO","❌ FALSO")+'</button></div>';
  }else{
    const opts=langES()?q.oe:q.o;
    body='<div class="opts">'+opts.map(o=>'<button class="opt-btn" data-l="'+o.l+'" onclick="bioAnswerOption('+i+',\''+o.l+'\')"><span class="ol">'+o.l+')</span><span>'+esc(o.v)+'</span></button>').join("")+'</div>';
  }
  d.innerHTML='<div class="q-head"><span class="q-num">'+fmt("Questão ","Pregunta ")+(i+1)+'</span><div style="display:flex;gap:.4rem;flex-wrap:wrap"><span class="q-tbadge '+(q.t==="tf"?"ttf":q.t==="mc"?"tmc":"tab")+'">'+label[q.t]+'</span><span class="ctag">'+esc(fmt(categories[q.c],q.c==="Lipídios"?"Lípidos":q.c==="Fosforilação oxidativa"?"Fosforilación oxidativa":q.c))+'</span></div></div><div class="res-ind" id="ri'+i+'"></div><p class="q-text">'+esc(fmt(q.q,q.qe))+'</p>'+body+'<div class="exp-box" id="ex'+i+'"><div class="et">'+fmt("📖 Explicação","📖 Explicación")+'</div><p>'+esc(fmt(q.ex,q.exe))+'</p></div>';
  ct.appendChild(d);
 }
 updateScores();filterQuiz();
};
window.bioAnswerOption=function(i,letter){
 const q=QD[i],card=document.getElementById("q"+i);
 if(card.classList.contains("ans"))return;
 const answer=langES()?q.crES:q.cr;
 for(const b of card.querySelectorAll(".opt-btn")){
  b.disabled=true;if(b.dataset.l===answer)b.classList.add("ca");if(b.dataset.l===letter&&letter!==answer)b.classList.add("wa");
 }
 const ok=letter===answer;card.classList.add("ans",ok?"cq":"wq");
 const result=document.getElementById("ri"+i);result.className="res-ind vis "+(ok?"c":"w");result.textContent=ok?fmt("✅ Correto!","✅ ¡Correcto!"):fmt("❌ Incorreto. Resposta: ","❌ Incorrecto. Respuesta: ")+answer;
 document.getElementById("ex"+i).classList.add("vis");
 if(ok)QS.c++;else QS.w++;QS.a++;updateScores();
};
window.answerTF=function(i,letter){
 const q=QD[i],card=document.getElementById("q"+i);
 if(card.classList.contains("ans"))return;
 for(const b of card.querySelectorAll(".tf-btn")){b.disabled=true;if(b.dataset.v===q.cr)b.classList.add("ca");if(b.dataset.v===letter&&letter!==q.cr)b.classList.add("wa")}
 const ok=letter===q.cr;card.classList.add("ans",ok?"cq":"wq");
 const result=document.getElementById("ri"+i);result.className="res-ind vis "+(ok?"c":"w");result.textContent=ok?fmt("✅ Correto!","✅ ¡Correcto!"):fmt("❌ Incorreto. Resposta: ","❌ Incorrecto. Respuesta: ")+(q.cr==="V"?fmt("VERDADEIRO","VERDADERO"):"FALSO");
 document.getElementById("ex"+i).classList.add("vis");
 if(ok)QS.c++;else QS.w++;QS.a++;updateScores();
};
qType.addEventListener("change",()=>window.renderQuiz());
function updateExam(){
 resetSelectors();setCounts();window.renderQuiz();window.renderFlashcards();
 // números devem vir de um único banco, nunca de literais de P1
 document.querySelectorAll("#quiz .q-stats .sbox.p .sv").forEach(n=>n.textContent=QD.length);
}
updateExam();
})();