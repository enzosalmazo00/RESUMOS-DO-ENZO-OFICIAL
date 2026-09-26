(function(){
  "use strict";

  var touchTimer=null;
  var countTimer=null;
  var currentClient=null;
  var currentSession=null;
  var lastAdminKeys=[];

  async function stop(){
    if(touchTimer)clearInterval(touchTimer);
    if(countTimer)clearInterval(countTimer);
    touchTimer=null;countTimer=null;
    currentClient=null;currentSession=null;lastAdminKeys=[];
  }

  async function start(client,session,options){
    options=options||{};
    if(!client||!session||!session.user)return null;
    await stop();

    currentClient=client;
    currentSession=session;

    var role=options.role==="admin"?"admin":"student";
    var page=options.page||document.title||location.pathname;
    var countElementId=options.countElementId||null;
    var onSync=options.onSync;
    var shouldTrack=options.track!==false;

    async function touch(){
      if(!shouldTrack)return;
      try{await client.rpc("presence_touch",{p_page:String(page||"").slice(0,160)})}
      catch(e){console.warn("[presence] touch:",e)}
    }

    async function sync(){
      try{
        if(role==="admin"){
          var r=await client.rpc("admin_online_students");
          if(r.error)throw r.error;
          var rows=Array.isArray(r.data)?r.data:[];
          lastAdminKeys=rows.map(function(x){return x.user_id});
          if(countElementId){
            var el=document.getElementById(countElementId);
            if(el)el.textContent=String(rows.length);
          }
          if(typeof onSync==="function"){
            var state={};
            rows.forEach(function(x){
              state[x.user_id]=[{
                role:"student",
                email:x.email,
                nome_preferido:x.nome_preferido,
                page:x.page,
                online_at:x.last_seen
              }];
            });
            onSync(rows.length,state,lastAdminKeys.slice());
          }
        }else{
          var c=await client.rpc("online_student_count");
          if(c.error)throw c.error;
          var count=Number(c.data||0);
          if(countElementId){
            var cel=document.getElementById(countElementId);
            if(cel)cel.textContent=String(count);
          }
          if(typeof onSync==="function"){
            // Usuário comum recebe apenas quantidade. Nunca IDs ou metadados.
            onSync(count,{},[]);
          }
        }
      }catch(e){console.warn("[presence] sync:",e)}
    }

    await touch();
    await sync();
    touchTimer=setInterval(touch,30000);
    countTimer=setInterval(sync,role==="admin"?12000:20000);

    return {private_presence:true};
  }

  window.EnzoPresence={
    start:start,
    stop:stop,
    getChannel:function(){return null},
    getStudentKeys:function(){return lastAdminKeys.slice()}
  };

  window.addEventListener("beforeunload",function(){
    if(touchTimer)clearInterval(touchTimer);
    if(countTimer)clearInterval(countTimer);
  });
})();