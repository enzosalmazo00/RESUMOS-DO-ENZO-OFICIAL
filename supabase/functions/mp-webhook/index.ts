const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "https://chqhdmjqnjjdatowfyif.supabase.co";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SB_SERVICE_KEY") || "";
const PLATFORM_MP_TOKEN = Deno.env.get("MP_ACCESS_TOKEN") || "";

const PRODUTO_COLUNAS: Record<string, string[]> = {
  bioquimica_p1:["bioquimica_p1"], bioquimica_p2:["bioquimica_p2"], bioquimica_final:["bioquimica_final"],
  biofisica_p1:["biofisica_p1"], biofisica_p2:["biofisica_p2"], biofisica_final:["biofisica_final"],
  genetica_p1:["genetica_p1"], genetica_p2:["genetica_p2"], genetica_final:["genetica_final"],
  fisiologia_p1:["fisiologia_p1"], fisiologia_p2:["fisiologia_p2"], fisiologia_final:["fisiologia_final"],
  microbiologia_p1:["microbiologia_p1"], microbiologia_p2:["microbiologia_p2"], microbiologia_final:["microbiologia_final"],
  micro_pratica_p1:["micro_pratica_p1"], micro_pratica_p2:["micro_pratica_p2"], micro_pratica_final:["micro_pratica_final"],
  imunologia_p1:["imunologia_p1"], imunologia_p2:["imunologia_p2"], imunologia_final:["imunologia_final"],
  pacote_p1:["bioquimica_p1","biofisica_p1","genetica_p1","fisiologia_p1","microbiologia_p1","micro_pratica_p1","imunologia_p1","pacote_p1"],
  pacote_p2:["bioquimica_p2","biofisica_p2","genetica_p2","fisiologia_p2","microbiologia_p2","micro_pratica_p2","imunologia_p2","pacote_p2"],
  pacote_final:["bioquimica_final","biofisica_final","genetica_final","fisiologia_final","microbiologia_final","micro_pratica_final","imunologia_final","pacote_final"],
  biologia_celular:["biologia_celular"], embriologia:["embriologia"], histologia_1:["histologia_1"], anatomia_1:["anatomia_1"],
  pacote_s1:["biologia_celular","embriologia","histologia_1","anatomia_1","pacote_s1"],
  psicologia_salud:["psicologia_salud"], medicina_comunitaria:["medicina_comunitaria"], histologia_2:["histologia_2"],
  guarani:["guarani"], anatomia_2:["anatomia_2"], bioestatistica:["bioestatistica"],
  pacote_s2:["psicologia_salud","medicina_comunitaria","histologia_2","guarani","anatomia_2","bioestatistica","pacote_s2"],
  fisiologia_2_p1:["fisiologia_2_p1"], fisiologia_2_p2:["fisiologia_2_p2"], fisiologia_2_final:["fisiologia_2_final"],
  bioquimica_2_p1:["bioquimica_2_p1"], bioquimica_2_p2:["bioquimica_2_p2"], bioquimica_2_final:["bioquimica_2_final"],
  epidemiologia_p1:["epidemiologia_p1"], epidemiologia_p2:["epidemiologia_p2"], epidemiologia_final:["epidemiologia_final"],
  nutricao_p1:["nutricao_p1"], nutricao_p2:["nutricao_p2"], nutricao_final:["nutricao_final"],
  microbiologia_2_p1:["microbiologia_2_p1"], microbiologia_2_p2:["microbiologia_2_p2"], microbiologia_2_final:["microbiologia_2_final"],
  micro_pratica_2_p1:["micro_pratica_2_p1"], micro_pratica_2_p2:["micro_pratica_2_p2"], micro_pratica_2_final:["micro_pratica_2_final"],
  eletrocardiograma_p1:["eletrocardiograma_p1"], eletrocardiograma_p2:["eletrocardiograma_p2"], eletrocardiograma_final:["eletrocardiograma_final"],
  pacote_s4_p1:["fisiologia_2_p1","bioquimica_2_p1","epidemiologia_p1","nutricao_p1","microbiologia_2_p1","micro_pratica_2_p1","eletrocardiograma_p1","pacote_s4_p1"],
  pacote_s4_p2:["fisiologia_2_p2","bioquimica_2_p2","epidemiologia_p2","nutricao_p2","microbiologia_2_p2","micro_pratica_2_p2","eletrocardiograma_p2","pacote_s4_p2"],
  pacote_s4_final:["fisiologia_2_final","bioquimica_2_final","epidemiologia_final","nutricao_final","microbiologia_2_final","micro_pratica_2_final","eletrocardiograma_final","pacote_s4_final"]
};

const CURSO_KEYS: Record<string, number> = { "curso-peconhentos": 50, "aulao-piloto": 50 };

async function sb(path: string, init: RequestInit = {}) {
  const h = new Headers(init.headers || {});
  h.set("apikey", SERVICE_KEY);
  h.set("Authorization", `Bearer ${SERVICE_KEY}`);
  if (!h.has("Content-Type")) h.set("Content-Type", "application/json");
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...init, headers: h });
}

async function logEvent(order: any, paymentId: string | null, eventType: string, status: string, providerStatus: string | null, message: string, metadata: Record<string, unknown> = {}) {
  try {
    await sb("payment_events", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        order_id: order?.id || null,
        user_id: order?.user_id || null,
        seller_user_id: order?.seller_user_id || null,
        payment_id: paymentId,
        event_type: eventType,
        status,
        provider_status: providerStatus,
        message,
        metadata,
      }),
    });
  } catch (_) {}
}

async function sellerToken(userId: string | null) {
  if (!userId) return PLATFORM_MP_TOKEN;
  const r = await sb(`professor_mp_credentials?professor_user_id=eq.${userId}&select=access_token&limit=1`, { method: "GET" });
  const rows = r.ok ? await r.json() : [];
  return rows?.[0]?.access_token || "";
}

async function getAulao(key: string) {
  const r = await sb(
    `auloes?chave=eq.${encodeURIComponent(key)}&select=id,chave,dias_acesso,payment_model,owner_user_id&limit=1`,
    { method: "GET" },
  );
  const rows = r.ok ? await r.json() : [];
  return rows?.[0] || null;
}

async function upsertAccess(userId: string, productKey: string, expiraEm: string | null, orderId: string) {
  const r = await sb("rpc/registrar_acesso_compra", {
    method: "POST",
    body: JSON.stringify({
      p_user_id: userId,
      p_resumo: productKey,
      p_expira_em: expiraEm,
      p_order_id: orderId,
    }),
  });
  return r.ok;
}

async function incrementCoupon(code: string | null) {
  if (!code) return;
  const r = await sb(`cupons?codigo=eq.${encodeURIComponent(code)}&select=id,usos&limit=1`, { method: "GET" });
  const row = r.ok ? (await r.json())?.[0] : null;
  if (!row?.id) return;
  await sb(`cupons?id=eq.${row.id}`, {
    method: "PATCH",
    body: JSON.stringify({ usos: Number(row.usos || 0) + 1 }),
  });
}

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const body = await req.json().catch(() => ({}));
    if (body.type && body.type !== "payment") return new Response("ok", { status: 200 });

    const paymentId = String(body.data?.id || "");
    if (!paymentId) return new Response("payment_id ausente", { status: 400 });

    const sellerHint = url.searchParams.get("seller");
    const token = await sellerToken(sellerHint);
    if (!token) return new Response("token de consulta indisponível", { status: 500 });

    const mr = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!mr.ok) return new Response("Erro ao consultar pagamento", { status: 500 });

    const mp = await mr.json();
    const ext = String(mp.external_reference || "");
    const orderId = ext.split("|")[0] || "";

    const or = orderId
      ? await sb(`orders?id=eq.${orderId}&select=*&limit=1`, { method: "GET" })
      : await sb(`orders?mp_payment_id=eq.${paymentId}&select=*&limit=1`, { method: "GET" });

    const orders = or.ok ? await or.json() : [];
    const order = orders?.[0];
    if (!order) return new Response("Pedido não encontrado", { status: 404 });

    if (order.seller_user_id && sellerHint && order.seller_user_id !== sellerHint) {
      return new Response("Vendedor divergente", { status: 403 });
    }

    await logEvent(order, paymentId, "webhook_received", "success", mp.status || null, "Webhook recebido e pagamento consultado no Mercado Pago", {
      status_detail: mp.status_detail || null,
    });

    const patch: any = {
      mp_payment_id: paymentId,
      status: mp.status || order.status,
      provider_status_detail: mp.status_detail || null,
      atualizado_em: new Date().toISOString(),
    };

    if (order.payment_split_mode === "marketplace_1to1") {
      const net = Number(mp.transaction_details?.net_received_amount);
      const gross = Number(order.valor || mp.transaction_amount || 0);
      const fee = Number(order.marketplace_fee || 0);
      if (Number.isFinite(net)) patch.seller_net_amount = Math.round(net * 100) / 100;
      if (Number.isFinite(net) && Number.isFinite(gross)) patch.mp_fee = Math.max(0, Math.round((gross - fee - net) * 100) / 100);
    }

    const providerApproval = Date.parse(mp.date_approved || "");
    const approvedAt = Number.isFinite(providerApproval) ? new Date(providerApproval).toISOString()
      : order.approved_at || new Date().toISOString();
    if (mp.status === "approved" && !order.approved_at) patch.approved_at = approvedAt;

    await sb(`orders?id=eq.${order.id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });

    if (mp.status !== "approved") {
      await logEvent(order, paymentId, "payment_not_approved", "info", mp.status || null, "Pagamento ainda não aprovado", {
        status_detail: mp.status_detail || null,
      });
      return new Response("ok", { status: 200 });
    }

    if (order.status === "approved" && order.access_granted_at) {
      await logEvent(order, paymentId, "webhook_idempotent", "success", "approved", "Webhook repetido ignorado com segurança");
      return new Response("ok", { status: 200 });
    }

    await logEvent(order, paymentId, "payment_verified", "success", "approved", "Pagamento aprovado confirmado diretamente no Mercado Pago");

    const keys = String(order.produto_key || "")
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);

    const unknown: string[] = [];
    const aulaos: any[] = [];

    for (const key of keys) {
      if (PRODUTO_COLUNAS[key] || CURSO_KEYS[key] !== undefined) continue;
      if (key.startsWith("aulao-")) {
        const a = await getAulao(key);
        if (a) aulaos.push(a);
        else unknown.push(key);
      } else {
        unknown.push(key);
      }
    }

    if (unknown.length) {
      await logEvent(order, paymentId, "access_failed", "error", "approved", "Produto aprovado sem configuração de acesso", { unknown });
      return new Response(`Produto não configurado: ${unknown.join(", ")}`, { status: 500 });
    }

    const resumoKeys = keys.filter((k) => PRODUTO_COLUNAS[k]);
    if (resumoKeys.length) {
      const exp = new Date(Date.parse(approvedAt) + 50 * 86400000);
      const expIso = exp.toISOString();

      const update: Record<string, unknown> = {};
      const accessCols = new Set<string>();

      for (const key of resumoKeys) {
        for (const col of PRODUTO_COLUNAS[key]) {
          update[col] = true;
          update[col + "_expira"] = expIso;
          accessCols.add(col);
        }
      }

      const r = await sb(`profiles?id=eq.${order.user_id}`, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify(update),
      });
      if (!r.ok) {
        await logEvent(order, paymentId, "access_failed", "error", "approved", "Falha ao atualizar acessos legados de resumos");
        return new Response("Erro ao liberar resumos", { status: 500 });
      }

      for (const col of accessCols) {
        const ok = await upsertAccess(order.user_id, col, expIso, order.id);
        if (!ok) {
          await logEvent(order, paymentId, "access_failed", "error", "approved", "Falha ao registrar acesso normalizado", { product_key: col });
          return new Response("Erro ao registrar acesso", { status: 500 });
        }
      }
    }

    for (const key of keys.filter((k) => CURSO_KEYS[k] !== undefined)) {
      const exp = new Date(Date.parse(approvedAt) + CURSO_KEYS[key] * 86400000);
      const ok = await upsertAccess(order.user_id, key, exp.toISOString(), order.id);
      if (!ok) {
        await logEvent(order, paymentId, "access_failed", "error", "approved", "Falha ao liberar curso", { product_key: key });
        return new Response("Erro ao liberar curso", { status: 500 });
      }
    }

    for (const a of aulaos) {
      const exp = a.dias_acesso ? new Date(Date.parse(approvedAt) + Number(a.dias_acesso) * 86400000) : null;
      const ok = await upsertAccess(order.user_id, a.chave, exp ? exp.toISOString() : null, order.id);
      if (!ok) {
        await logEvent(order, paymentId, "access_failed", "error", "approved", "Falha ao liberar aula", { product_key: a.chave });
        return new Response("Erro ao liberar aula", { status: 500 });
      }
    }

    const now = new Date().toISOString();
    const approvedPatch: any = {
      status: "approved",
      approved_at: order.approved_at || approvedAt,
      access_granted_at: now,
      provider_status_detail: mp.status_detail || "approved",
      atualizado_em: now,
    };

    if (patch.seller_net_amount != null) approvedPatch.seller_net_amount = patch.seller_net_amount;
    if (patch.mp_fee != null) approvedPatch.mp_fee = patch.mp_fee;

    await sb(`orders?id=eq.${order.id}`, {
      method: "PATCH",
      body: JSON.stringify(approvedPatch),
    });

    if (order.payment_split_mode === "marketplace_1to1") {
      await sb(`order_items?order_id=eq.${order.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          platform_fee: Number(order.marketplace_fee || 0),
          mp_fee: patch.mp_fee ?? null,
          seller_amount: patch.seller_net_amount ?? null,
        }),
      });
    }

    if (order.coupon_code) await incrementCoupon(order.coupon_code);

    await logEvent(order, paymentId, "access_granted", "success", "approved", "Acesso liberado e registrado", { products: keys });
    await logEvent(order, paymentId, "payment_approved", "success", "approved", "Pedido concluído com sucesso", {
      seller_net_amount: patch.seller_net_amount ?? order.seller_net_amount ?? null,
      marketplace_fee: order.marketplace_fee ?? null,
      mp_fee: patch.mp_fee ?? order.mp_fee ?? null,
    });

    return new Response("ok", { status: 200 });
  } catch (err) {
    console.error("mp-webhook:", err);
    return new Response("Erro interno", { status: 500 });
  }
});
