(function (root) {
  "use strict";
  const subjects3 = ["bioquimica","biofisica","genetica","fisiologia","microbiologia","micro_pratica","imunologia"];
  const subjects4 = ["fisiologia_2","bioquimica_2","epidemiologia","nutricao","microbiologia_2","micro_pratica_2","eletrocardiograma"];
  const groups = [
    ["s1",1,"unico",["biologia_celular","embriologia","histologia_1","anatomia_1"],1500,1200,3990,["biologia_celular"],"pacote_s1"],
    ["s2",2,"unico",["psicologia_salud","medicina_comunitaria","histologia_2","guarani","anatomia_2","bioestatistica"],1500,1200,5990,[],"pacote_s2"],
    ["s3_p1",3,"p1",subjects3,1500,1200,6990,[],"pacote_p1"],
    ["p2",3,"p2",subjects3,1500,1200,6990,subjects3,"pacote_p2",["preco_unit","preco_combo3","preco_pack"]],
    ["final",3,"final",subjects3,2499,1999,8990,subjects3,"pacote_final",["preco_final_unit",null,"preco_final_pack"]],
    ["s4_p1",4,"p1",subjects4,1290,1090,3990,subjects4,"pacote_s4_p1"],
    ["s4_p2",4,"p2",subjects4,1290,1090,4990,subjects4,"pacote_s4_p2"],
    ["s4_final",4,"final",subjects4,1290,1090,3990,[],"pacote_s4_final"]
  ].map(([id,semester,exam,subjects,unit,bulk,pack,ready,packageKey,legacy]) => {
    const key = subject => exam === "unico" ? subject : subject + "_" + exam;
    return {id, semester, exam, keys: subjects.map(key), ready: ready.map(key), packageKey, unit, bulk, pack, legacy:legacy || []};
  });
  const products = Object.fromEntries(groups.flatMap(g => g.keys.map(key => [key,g])));
  const packages = Object.fromEntries(groups.map(g => [g.packageKey,g]));
  const configKey = "loja_precos_v1";
  const configKeys = [configKey, ...groups.flatMap(g=>g.legacy.filter(Boolean))];
  const validCents = value => Number.isSafeInteger(value) && value > 0 && value <= 10000000;
  const amount = (value,fallback) => validCents(value) ? value : fallback;
  const cents = value => Math.round(Number(value) * 100);

  function settings(rows) {
    const values = Object.fromEntries((rows || []).map(row => [row.chave,row.valor]));
    const saved = values[configKey] ? JSON.parse(values[configKey]) : {};
    return {
      groups: Object.fromEntries(groups.map(g => [g.id, Object.fromEntries(["unit","bulk","pack"].map((key,i) =>
        [key, amount(saved.groups?.[g.id]?.[key], amount(cents(values[g.legacy[i]]),g[key]))]))])),
      itemPrices: saved.itemPrices || {},
      course: amount(saved.course,2999),
      combos: Array.isArray(saved.combos) ? saved.combos : []
    };
  }

  function price(key, store) {
    if(key === "curso-peconhentos") return store.course;
    if(packages[key]) return store.groups[packages[key].id].pack;
    if(products[key]) return amount(store.itemPrices[key],store.groups[products[key].id].unit);
    throw new Error("Produto indisponível no catálogo.");
  }

  function matches(coupon,key) {
    if(!coupon || !products[key]) return false;
    const scope = coupon.escopo || {};
    const group = products[key];
    return (!scope.item || scope.item === key) &&
      (!scope.semester || Number(scope.semester) === group.semester) &&
      (!scope.exam || scope.exam === group.exam);
  }

  function quote(keys, store, coupon, selections = []) {
    if(!keys.length || new Set(keys).size !== keys.length) throw new Error("Revise os produtos do carrinho.");
    const lines = new Map(keys.map(key => [key,{key,base:price(key,store),net:price(key,store),combo:false}]));
    const applied = new Set();
    const subtotal = [...lines.values()].reduce((total,row)=>total+row.base,0);
    const comboNames = [];
    function apply(members,total,name) {
      const base = members.reduce((sum,key)=>sum+lines.get(key).base,0);
      const charge = Math.min(base,total);
      let distributed = 0;
      members.forEach((key,index) => {
        const row = lines.get(key);
        row.combo = true;
        row.net = index === members.length-1 ? charge-distributed : Math.floor(charge*row.base/base);
        distributed += row.net;
      });
      comboNames.push(name);
    }
    for(const id of new Set(selections)) {
      const bundle = store.combos.find(combo=>combo.id===id && combo.active!==false);
      if(!bundle || !validCents(bundle.price) || !Array.isArray(bundle.keys) || bundle.keys.length<2 ||
        new Set(bundle.keys).size!==bundle.keys.length || bundle.keys.some(key=>!products[key] || !lines.has(key) || applied.has(key))) {
        throw new Error("Um combo mudou. Remova-o e adicione novamente.");
      }
      bundle.keys.forEach(key=>applied.add(key));
      apply(bundle.keys,bundle.price,bundle.name);
    }
    for(const group of groups) {
      const standalone = lines.get(group.packageKey);
      if(standalone) {
        if(group.keys.some(key=>lines.has(key))) throw new Error("O pacote completo já inclui os resumos deste grupo.");
        standalone.combo = true;
      }
      const members = group.keys.filter(key=>lines.has(key) && !applied.has(key));
      if(members.length < 3) continue;
      const rate = store.groups[group.id];
      const normal = members.reduce((total,key)=>total+lines.get(key).base,0);
      const bulk = members.reduce((total,key)=>total+Math.min(rate.bulk,lines.get(key).base),0);
      const packageTotal = members.length === group.keys.length ? rate.pack : normal;
      const best = Math.min(normal,bulk,packageTotal);
      if(best < normal) apply(members,best,best===packageTotal ? "Pacote completo" : "Combo de 3 ou mais");
    }
    const comboTotal = [...lines.values()].reduce((sum,row)=>sum+row.net,0);
    const rate = Math.max(0,Math.min(100,Number(coupon?.desconto_pct || 0)));
    const eligible = [...lines.values()].filter(row=>!row.combo && matches(coupon,row.key));
    const base = eligible.reduce((sum,row)=>sum+row.net,0);
    const discount = Math.min(Math.round(base*rate/100),Math.max(0,comboTotal-1));
    let distributed = 0;
    let distributedBase = 0;
    eligible.forEach((row,index)=>{
      const share = index===eligible.length-1 ? discount-distributed : Math.round(discount*(distributedBase+row.net)/base)-distributed;
      distributedBase += row.net;
      row.net -= share;
      distributed += share;
    });
    return {subtotal,comboTotal,discount,total:comboTotal-discount,comboNames,lines:[...lines.values()]};
  }
  root.StorePricing = {groups,products,packages,configKey,configKeys,settings,price,quote,validCents,cents};
})(globalThis);
