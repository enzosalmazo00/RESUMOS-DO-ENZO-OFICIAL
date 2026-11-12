(()=>{'use strict';
const url='https://chqhdmjqnjjdatowfyif.supabase.co',key='sb_publishable_cgNwK1hWh8IoNm9cX9M7zQ_oqk6Dszn';
let db,user,isAdmin=false,mode='public',reply=null;
const $=s=>document.querySelector(s),safe=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function status(s){$('#rde-msg-status').textContent=s}
async function refresh(){
const box=$('#rde-msg-list');if(!user){box.textContent='Entre na sua conta para visualizar as mensagens.';return}
const {data,error}=await db.from('community_messages').select('id,user_id,author_name,is_team,body,audience,parent_id,created_at,hidden').eq('audience',mode).order('created_at',{ascending:true}).limit(250);
if(error){status(error.message);return}
box.innerHTML=(data||[]).filter(m=>isAdmin||!m.hidden).map(m=>'<article class="rde-msg-item" style="margin:10px 0;padding:12px;background:#132c40;border-radius:10px;'+(m.parent_id?'margin-left:18px;':'')+'"><strong>'+safe(m.author_name)+(m.is_team?' · Equipe':'')+'</strong><small> · '+new Date(m.created_at).toLocaleString('pt-BR')+'</small><p style="white-space:pre-wrap;overflow-wrap:anywhere">'+safe(m.body)+'</p><button data-reply="'+safe(m.id)+'">Responder</button> '+(isAdmin?'<button data-hide="'+safe(m.id)+'" data-hidden="'+m.hidden+'">'+(m.hidden?'Reexibir':'Ocultar')+'</button>':'')+'</article>').join('')||'<p>Nenhuma mensagem nesta seção.</p>';
}
async function send(){
const t=$('#rde-msg-text'),body=t.value.trim();if(body.length<2){status('Escreva uma mensagem.');return}
if(!user){sessionStorage.setItem('rde-draft',JSON.stringify({body,mode}));status('Mensagem salva neste navegador. Entre na conta para enviar.');return}
const btn=$('#rde-msg-send');btn.disabled=true;
try{
const name=(user.user_metadata?.full_name||user.user_metadata?.name||user.email?.split('@')[0]||'Estudante').slice(0,90);
const {error}=await db.from('community_messages').insert({user_id:user.id,author_name:name,is_team:isAdmin,body,audience:mode,parent_id:reply});
if(error)throw error;t.value='';reply=null;sessionStorage.removeItem('rde-draft');status('Enviado com sucesso!');await refresh();
}catch(e){status('Falha no envio: '+e.message)}finally{btn.disabled=false}
}
async function start(){
const style=document.createElement('style');style.textContent='.rde-messages{max-width:1050px;margin:20px auto;padding:22px;border:1px solid #42687d;border-radius:18px;background:#0b1c2b;color:#eaf4ff;font:14px system-ui}.rde-messages *{box-sizing:border-box}.rde-messages button{cursor:pointer;padding:9px 13px;margin:4px;border:1px solid #568da3;border-radius:9px;background:#17435a;color:#fff}.rde-messages textarea{width:100%;min-height:85px;padding:12px;background:#071523;color:#fff;border:1px solid #568da3;border-radius:10px}.rde-messages small{color:#acc7d4}.rde-messages p{line-height:1.5}';document.head.append(style);
const adminPage=document.body.dataset.rdeCommunityAdmin==='1';
const host=adminPage?$('.admin-tabs'):$('.rde-login-notice')||$('.hero-content');
if(!host)return;
const el=document.createElement('section');el.className='rde-messages';el.innerHTML='<h2>💬 '+(adminPage?'Central de mensagens':'Mensagens para o Resumos do Enzo')+'</h2><p>Deixe sua mensagem para a equipe ou converse com outros estudantes.</p><div><button data-mode="public">Mural público</button><button data-mode="private">Mensagens particulares</button></div><textarea id="rde-msg-text" maxlength="2000" placeholder="Escreva sua mensagem..."></textarea><p><button id="rde-msg-send">Enviar mensagem</button><button id="rde-msg-refresh">Atualizar</button><button id="rde-msg-cancel" hidden>Cancelar resposta</button></p><p id="rde-msg-status" role="status"></p><div id="rde-msg-list"></div>';
host.insertAdjacentElement('afterend',el);
$('#rde-msg-send').onclick=send;$('#rde-msg-refresh').onclick=refresh;$('#rde-msg-cancel').onclick=()=>{reply=null;$('#rde-msg-cancel').hidden=true};
el.addEventListener('click',async e=>{const b=e.target.closest('button');if(!b)return;
if(b.dataset.mode){mode=b.dataset.mode;reply=null;await refresh()}
if(b.dataset.reply){reply=b.dataset.reply;$('#rde-msg-cancel').hidden=false;$('#rde-msg-text').focus();status('Respondendo à mensagem selecionada.')}
if(b.dataset.hide&&isAdmin){const {error}=await db.from('community_messages').update({hidden:b.dataset.hidden!=='true'}).eq('id',b.dataset.hide);status(error?error.message:'Moderação atualizada.');if(!error)await refresh()}
});
try{
if(!window.supabase?.createClient)throw Error('Biblioteca de autenticação indisponível');
db=window.supabase.createClient(url,key);
const r=await db.auth.getUser();user=r.data?.user||null;
if(user){const p=await db.from('profiles').select('is_admin').eq('id',user.id).maybeSingle();isAdmin=!!p.data?.is_admin}
if(adminPage&&!isAdmin){el.remove();return}
const draft=sessionStorage.getItem('rde-draft');if(draft){const d=JSON.parse(draft);$('#rde-msg-text').value=d.body||'';mode=d.mode==='private'?'private':'public';status('Mensagem recuperada. Clique em enviar para publicar.')}
await refresh();if(user)setInterval(()=>{if(document.visibilityState==='visible')refresh()},30000);
}catch(e){status('Não foi possível iniciar: '+e.message)}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();