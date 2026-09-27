/* platform-addon.js — v2 non-blocking */
(function(){
"use strict";

let started=false;

async function start(client,session){
  if(started)return;
  const c=client||window.authClient;
  const s=session||window.authSession;
  const u=s?.user?.id;
  if(!c||!u)return;

  started=true;

  const header=document.querySelector(".header-right");
  if(header&&!document.getElementById("platformAccountBtn")){
    const a=document.createElement("a");
    a.id="platformAccountBtn";
    a.className="logout-btn";
    a.href="conta.html";
    a.textContent="👤 Minha Conta";
    header.insertBefore(a,header.lastElementChild);

    const p=document.createElement("a");
    p.id="platformProgressBtn";
    p.className="logout-btn";
    p.href="progresso.html";
    p.textContent="📈 Progresso";
    header.insertBefore(p,header.lastElementChild);
  }

  // Compatibilidade com versões antigas do dashboard.
  const studentTab=[...document.querySelectorAll(".tab-btn")].find(btn=>
    (btn.textContent||"").toLowerCase().includes("área do aluno")
  );
  if(studentTab){
    studentTab.setAttribute("onclick","window.location.href='area-aluno.html'");
    studentTab.textContent="🎓 Área do Aluno";
    studentTab.title="Notas, desempenho e progresso acadêmico";
  }
  const oldStudentPanel=document.getElementById("tab-aluno");
  if(oldStudentPanel)oldStudentPanel.remove();

  if(document.getElementById("platformContinueCard"))return;

  try{
    const r=await c.from("study_progress")
      .select("*")
      .eq("user_id",u)
      .order("last_opened_at",{ascending:false})
      .limit(1)
      .maybeSingle();

    if(r.error||!r.data)return;

    const x=r.data;
    const welcome=document.getElementById("welcomeBox");
    if(!welcome)return;

    const card=document.createElement("div");
    card.id="platformContinueCard";
    card.style.cssText="margin:0 0 16px;padding:17px 18px;border:1px solid rgba(34,211,238,.2);border-radius:15px;background:linear-gradient(135deg,rgba(34,211,238,.08),rgba(6,182,212,.025));display:flex;align-items:center;gap:14px;flex-wrap:wrap";

    const pct=Math.round(Number(x.progress_percent||0));
    const key=String(x.product_key||"").replace(/_/g," ");

    card.innerHTML=`<div style="flex:1;min-width:220px"><div style="font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.12em;color:rgba(34,211,238,.6)">Continuar estudando</div><div style="font-size:15px;font-weight:700;margin-top:3px">${key}</div><div style="font-size:10px;color:rgba(165,243,252,.48);margin-top:2px">${x.last_section||"Última atividade"} · ${pct}% concluído</div><div style="height:7px;background:rgba(255,255,255,.07);border-radius:99px;overflow:hidden;margin-top:8px"><i style="display:block;height:100%;width:${Math.max(2,pct)}%;background:linear-gradient(90deg,#22d3ee,#67e8f9)"></i></div></div>${x.last_url?`<a href="${x.last_url}" style="text-decoration:none;padding:9px 13px;border-radius:10px;background:linear-gradient(135deg,#22d3ee,#0891b2);color:#00131a;font:700 11px Poppins">Continuar →</a>`:""}`;

    welcome.insertAdjacentElement("afterend",card);
  }catch(e){
    console.warn("[platform-addon]",e);
  }
}

window.EnzoPlatformAddon={start};

document.addEventListener("authReady",function(e){
  start(window.authClient,e?.detail?.session||window.authSession);
});

// Caso o addon tenha sido carregado depois do authReady.
if(window.authSession&&window.authClient){
  Promise.resolve().then(()=>start(window.authClient,window.authSession));
}
})();
