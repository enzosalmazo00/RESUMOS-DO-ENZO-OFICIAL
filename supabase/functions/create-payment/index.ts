import "./store-pricing.js";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "https://chqhdmjqnjjdatowfyif.supabase.co";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SB_SERVICE_KEY") || "";
const PLATFORM_MP_TOKEN = Deno.env.get("MP_ACCESS_TOKEN") || "";
const MP_CLIENT_ID = Deno.env.get("MP_CLIENT_ID") || "";
const MP_CLIENT_SECRET = Deno.env.get("MP_CLIENT_SECRET") || "";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

function money(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function inferType(key: string) {
  if (key.startsWith("aulao-")) return "aulao";
  if (key.startsWith("curso-")) return "curso";
  return "resumo";
}

const pricing = (globalThis as any).StorePricing;

async function loadPrices() {
  const result = await sb("config?select=chave,valor&chave=in.("+pricing.configKeys.join(",")+")");
  if (!result.ok) throw new Error("Não foi possível consultar os preços da loja.");
  return pricing.settings(await result.json());
}

async function sb(path: string, init: RequestInit = {}) {
  const h = new Headers(init.headers || {});
  h.set("apikey", SERVICE_KEY);
  h.set("Authorization", `Bearer ${SERVICE_KEY}`);
  if (!h.has("Content-Type")) h.set("Content-Type", "application/json");
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...init, headers: h });
}

async function getUser(req: Request) {
  const auth = req.headers.get("Authorization") || "";
  const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SERVICE_KEY, Authorization: auth },
  });
  return r.ok ? await r.json() : null;
}

async function logEvent(
  orderId: string,
  userId: string,
  sellerUserId: string | null,
  paymentId: string | null,
  eventType: string,
  status: string,
  providerStatus: string | null,
  message: string,
  metadata: Record<string, unknown> = {},
) {
  try {
    await sb("payment_events", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        order_id: orderId,
        user_id: userId,
        seller_user_id: sellerUserId,
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

async function refreshSellerToken(userId: string, cred: any) {
  if (!cred?.refresh_token || !MP_CLIENT_ID || !MP_CLIENT_SECRET) return cred;
  const tr = await fetch("https://api.mercadopago.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_id: MP_CLIENT_ID,
      client_secret: MP_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: cred.refresh_token,
    }),
  });
  const data = await tr.json().catch(() => ({}));
  if (!tr.ok || !data.access_token) return cred;

  const ttl = Number(data.expires_in || 15552000);
  const expiresAt = new Date(Date.now() + ttl * 1000).toISOString();
  const updated = {
    ...cred,
    access_token: data.access_token,
    refresh_token: data.refresh_token || cred.refresh_token,
    public_key: data.public_key || cred.public_key,
    mp_user_id: data.user_id != null ? String(data.user_id) : cred.mp_user_id,
    live_mode: data.live_mode ?? cred.live_mode,
    expires_at: expiresAt,
  };

  await sb("professor_mp_credentials?on_conflict=professor_user_id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({
      professor_user_id: userId,
      access_token: updated.access_token,
      refresh_token: updated.refresh_token,
      public_key: updated.public_key || null,
      mp_user_id: updated.mp_user_id || null,
      live_mode: updated.live_mode ?? null,
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    }),
  });

  await sb("professor_mp_connections?on_conflict=professor_user_id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({
      professor_user_id: userId,
      status: "connected",
      mp_user_id: updated.mp_user_id || null,
      live_mode: updated.live_mode ?? null,
      expires_at: expiresAt,
      last_error: null,
      updated_at: new Date().toISOString(),
    }),
  });

  return updated;
}

async function sellerContext(aulao: any) {
  if (aulao.payment_model !== "marketplace_split") {
    return { mode: "platform_direct", token: PLATFORM_MP_TOKEN, sellerUserId: null, rate: null, fee: null };
  }

  const userId = aulao.owner_user_id;
  if (!userId) throw new Error("Aula de colaborador sem produtor vinculado");

  const pr = await sb(
    `professor_dados?user_id=eq.${userId}&select=categoria_produtor&limit=1`,
    { method: "GET" },
  );
  const pd = pr.ok ? (await pr.json())?.[0] : null;
  if (!pd?.categoria_produtor) throw new Error("Categoria do produtor não configurada");

  const rate =
    pd.categoria_produtor === "medico_docente"
      ? 0.25
      : pd.categoria_produtor === "aluno"
      ? 0.3333
      : NaN;
  if (!Number.isFinite(rate)) throw new Error("Categoria do produtor inválida");

  const cr = await sb(
    `professor_mp_credentials?professor_user_id=eq.${userId}&select=*&limit=1`,
    { method: "GET" },
  );
  let cred = cr.ok ? (await cr.json())?.[0] : null;
  if (!cred?.access_token) throw new Error("O produtor ainda não vinculou a conta Mercado Pago");

  const expires = cred.expires_at ? new Date(cred.expires_at).getTime() : 0;
  const days = expires ? (expires - Date.now()) / 86400000 : -1;
  if (days <= 30) cred = await refreshSellerToken(userId, cred);
  if (cred.expires_at && new Date(cred.expires_at).getTime() <= Date.now()) {
    throw new Error("A autorização Mercado Pago do produtor expirou e precisa ser renovada");
  }

  return { mode: "marketplace_1to1", token: cred.access_token, sellerUserId: userId, rate, fee: null };
}

async function validateCoupon(code: string | null) {
  if (!code) return null;
  const normalized = String(code).trim().toUpperCase();
  const r = await sb(
    `cupons?codigo=eq.${encodeURIComponent(normalized)}&select=codigo,desconto_pct,ativo,max_usos,usos,expira_em,escopo&limit=1`,
    { method: "GET" },
  );
  const c = r.ok ? (await r.json())?.[0] : null;
  if (!c) throw new Error("Cupom não encontrado");
  if (!c.ativo) throw new Error("Cupom inativo");
  if (c.expira_em && new Date(c.expira_em).getTime() < Date.now()) throw new Error("Cupom expirado");
  if (c.max_usos != null && Number(c.usos || 0) >= Number(c.max_usos)) throw new Error("Cupom esgotado");
  return c;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    if (!SERVICE_KEY || !PLATFORM_MP_TOKEN) return json({ error: "Backend de pagamentos não configurado" }, 500);

    const body = await req.json();
    let {
      produto_key,
      produto_nome,
      valor,
      user_email,
      metodo,
      items,
      coupon_code,
      combo_ids,
      pricing_version,
    } = body;

    if (!produto_key) return json({ error: "Produto não informado" }, 400);

    const user = await getUser(req);
    if (!user?.id) return json({ error: "Sessão inválida" }, 401);

    const userId = user.id;
    user_email = user.email || user_email || "aluno@resumosdoenzo.com";
    metodo = metodo === "card" ? "card" : "pix";

    const keys = String(produto_key)
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);

    const aulaoKeys = keys.filter((k) => k.startsWith("aulao-"));
    let payment = { mode: "platform_direct", token: PLATFORM_MP_TOKEN, sellerUserId: null as string | null, rate: null as number | null, fee: null as number | null };
    let canonicalItems: any[] = Array.isArray(items) ? items : [];
    let orderBaseAmount: number | null = null;
    let processingFeeRate = 0;
    let processingFeeSurcharge = 0;

    if (aulaoKeys.length) {
      if (keys.length !== 1) return json({ error: "Aulas em Vídeo devem ser compradas separadamente dos outros produtos." }, 400);

      const ar = await sb(
        `auloes?chave=eq.${encodeURIComponent(aulaoKeys[0])}&publicado=eq.true&exibir_loja=eq.true&select=id,chave,nome,preco,payment_model,origem,owner_user_id,materia,avaliacao,semestre&limit=1`,
        { method: "GET" },
      );
      const aulao = ar.ok ? (await ar.json())?.[0] : null;
      if (!aulao || Number(aulao.preco) <= 0) return json({ error: "Aula em Vídeo indisponível para compra." }, 400);

      const baseAmount = Number(aulao.preco);
      produto_nome = aulao.nome;
      payment = await sellerContext(aulao);

      orderBaseAmount = money(baseAmount);
      if (payment.mode === "marketplace_1to1") {
        processingFeeRate = 0.015;
        processingFeeSurcharge = money(baseAmount * processingFeeRate);
        valor = money(baseAmount + processingFeeSurcharge);
        payment.fee = money(baseAmount * Number(payment.rate));
      } else {
        valor = money(baseAmount);
      }

      canonicalItems = [{
        key: aulao.chave,
        label: aulao.nome,
        tipo: "aulao",
        preco: Number(valor),
        base_price: baseAmount,
        processing_fee_surcharge: processingFeeSurcharge,
        aulao_id: aulao.id,
      }];
    }

    let coupon = null;
    let discountAmount = 0;
    if (!aulaoKeys.length) {
      if (pricing_version !== 1) return json({ error: "Atualize a página da loja para revisar seu pedido." }, 409);
      if (combo_ids != null && (!Array.isArray(combo_ids) || combo_ids.some(id => typeof id !== "string"))) {
        return json({ error: "Combos inválidos no pedido." }, 400);
      }
      const prices = await loadPrices();
      let quote;
      try {
        for (const key of keys) {
          const group = pricing.products[key] || pricing.packages[key];
          if (group && (pricing.packages[key] ? group.ready.length !== group.keys.length : !group.ready.includes(key))) {
            throw new Error("Um material deste pedido está indisponível.");
          }
        }
        coupon = await validateCoupon(coupon_code || null);
        quote = pricing.quote(keys, prices, coupon, combo_ids || []);
        if (coupon && !quote.discount) throw new Error("O cupom não se aplica aos itens avulsos do pedido.");
      } catch (error) {
        return json({ error: error instanceof Error ? error.message : "Revise os itens do pedido." }, 400);
      }
      if (pricing.cents(valor) !== quote.total) {
        return json({ error: "O preço do pedido mudou. Atualize a loja e revise o carrinho antes de pagar." }, 409);
      }
      valor = quote.total / 100;
      orderBaseAmount = quote.comboTotal / 100;
      discountAmount = quote.discount / 100;
      const names = new Map(canonicalItems.map(item=>[item.key,item.label]));
      canonicalItems = quote.lines.map((line: {key:string,base:number,net:number})=>({
        key:line.key,
        label:names.get(line.key) || line.key,
        tipo:inferType(line.key),
        preco:line.net / 100,
        base_price:line.base / 100,
      }));
    } else if (coupon_code) {
      return json({ error: "Este cupom é válido para resumos avulsos." }, 400);
    }
    if (!Number.isFinite(valor) || valor <= 0) return json({ error: "Valor inválido." }, 400);

    const descricao = aulaoKeys.length
      ? `Resumos do Enzo — ${produto_nome}`
      : keys.some((k) => k.startsWith("curso-")) && keys.length === 1
      ? "Resumos do Enzo — Curso"
      : keys.length > 1
      ? `Resumos do Enzo — ${keys.length} item(ns)`
      : `Resumos do Enzo — ${produto_nome}`;

    const oi = await sb("orders", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        user_id: userId,
        produto_key,
        produto_nome: produto_nome || descricao,
        valor,
        base_amount: orderBaseAmount,
        processing_fee_rate: processingFeeRate,
        processing_fee_surcharge: processingFeeSurcharge,
        status: "creating",
        seller_user_id: payment.sellerUserId,
        commission_rate: payment.rate,
        marketplace_fee: payment.fee,
        payment_split_mode: payment.mode,
        payment_method: metodo,
        coupon_code: coupon?.codigo || null,
        discount_amount: discountAmount,
        currency: "BRL",
      }),
    });

    const rows = oi.ok ? await oi.json() : [];
    const order = rows?.[0];
    if (!order?.id) return json({ error: "Não foi possível registrar o pedido" }, 500);

    const byKey = new Map(
      (canonicalItems || []).map((it: any) => [String(it.key || it.product_key || ""), it]),
    );
    const itemRows = keys.map((key) => {
      const src: any = byKey.get(key) || {};
      const single = keys.length === 1;
      return {
        order_id: order.id,
        product_key: key,
        product_name: String(src.label || src.name || src.product_name || (single ? produto_nome : key)),
        product_type: String(src.tipo || src.product_type || inferType(key)),
        unit_price: single ? valor : (Number.isFinite(Number(src.preco)) ? Number(src.preco) : null),
        line_total: single ? valor : (Number.isFinite(Number(src.preco)) ? Number(src.preco) : null),
        quantity: 1,
        seller_user_id: payment.sellerUserId,
        commission_rate: payment.rate,
        platform_fee: single ? payment.fee : null,
        metadata: {
          source: "checkout",
          requested_price: Number.isFinite(Number(src.preco)) ? Number(src.preco) : null,
          base_price: Number.isFinite(Number(src.base_price)) ? Number(src.base_price) : null,
          processing_fee_surcharge: Number(src.processing_fee_surcharge || 0),
          coupon_code: coupon?.codigo || null,
        },
      };
    });

    if (itemRows.length) {
      await sb("order_items?on_conflict=order_id,product_key", {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify(itemRows),
      });
    }

    await logEvent(
      order.id,
      userId,
      payment.sellerUserId,
      null,
      "payment_requested",
      "success",
      "creating",
      "Pagamento solicitado ao Mercado Pago",
      { metodo, valor, itens: keys.length, coupon_code: coupon?.codigo || null },
    );

    const ext = `${order.id}|${userId}|${produto_key}`;
    const sellerParam = payment.sellerUserId ? `?seller=${encodeURIComponent(payment.sellerUserId)}` : "";
    const notificationUrl = `${SUPABASE_URL}/functions/v1/mp-webhook${sellerParam}`;
    const idem = `order-${order.id}`;

    if (metodo === "card") {
      const payload: any = {
        items: [{ title: descricao, quantity: 1, unit_price: valor, currency_id: "BRL" }],
        payer: { email: user_email },
        payment_methods: { excluded_payment_types: [{ id: "ticket" }], installments: 6 },
        back_urls: {
          success: "https://enzosalmazo00.github.io/RESUMOS-DO-ENZO-OFICIAL/dashboard.html?pagamento=sucesso",
          failure: "https://enzosalmazo00.github.io/RESUMOS-DO-ENZO-OFICIAL/dashboard.html?pagamento=falha",
          pending: "https://enzosalmazo00.github.io/RESUMOS-DO-ENZO-OFICIAL/dashboard.html?pagamento=pendente",
        },
        auto_return: "approved",
        external_reference: ext,
        notification_url: notificationUrl,
      };

      if (payment.mode === "marketplace_1to1") payload.marketplace_fee = payment.fee;

      const r = await fetch("https://api.mercadopago.com/checkout/preferences", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${payment.token}`,
          "Content-Type": "application/json",
          "X-Idempotency-Key": idem,
        },
        body: JSON.stringify(payload),
      });

      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        await sb(`orders?id=eq.${order.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            status: "payment_error",
            provider_status_detail: JSON.stringify(data).slice(0, 1000),
            atualizado_em: new Date().toISOString(),
          }),
        });
        await logEvent(order.id, userId, payment.sellerUserId, null, "checkout_create_failed", "error", null, "Falha ao criar checkout com cartão", { details: data });
        return json({ error: "Erro ao criar pagamento", details: data }, 500);
      }

      await sb(`orders?id=eq.${order.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          mp_preference_id: String(data.id),
          status: "pending_card",
          provider_status_detail: "checkout_created",
          atualizado_em: new Date().toISOString(),
        }),
      });

      await logEvent(order.id, userId, payment.sellerUserId, null, "checkout_created", "success", "pending", "Checkout com cartão criado", { preference_id: data.id });

      return json({
        metodo: "card",
        init_point: data.init_point,
        preference_id: data.id,
        order_id: order.id,
        payment_model: payment.mode,
        charged_amount: valor,
      });
    }

    const pixPayload: any = {
      transaction_amount: valor,
      description: descricao,
      payment_method_id: "pix",
      payer: { email: user_email },
      external_reference: ext,
      notification_url: notificationUrl,
    };

    if (payment.mode === "marketplace_1to1") pixPayload.application_fee = payment.fee;

    const r = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${payment.token}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": idem,
      },
      body: JSON.stringify(pixPayload),
    });

    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      await sb(`orders?id=eq.${order.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          status: "payment_error",
          provider_status_detail: JSON.stringify(data).slice(0, 1000),
          atualizado_em: new Date().toISOString(),
        }),
      });
      await logEvent(order.id, userId, payment.sellerUserId, null, "pix_create_failed", "error", null, "Falha ao criar PIX", { details: data });
      return json({ error: "Erro ao criar pagamento", details: data }, 500);
    }

    await sb(`orders?id=eq.${order.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        mp_payment_id: String(data.id),
        status: data.status || "pending",
        provider_status_detail: data.status_detail || null,
        atualizado_em: new Date().toISOString(),
      }),
    });

    await logEvent(
      order.id,
      userId,
      payment.sellerUserId,
      String(data.id),
      "pix_created",
      "success",
      data.status || "pending",
      "PIX criado",
      { status_detail: data.status_detail || null },
    );

    return json({
      metodo: "pix",
      payment_id: data.id,
      qr_code: data.point_of_interaction?.transaction_data?.qr_code,
      qr_code_base64: data.point_of_interaction?.transaction_data?.qr_code_base64,
      order_id: order.id,
      payment_model: payment.mode,
      charged_amount: valor,
    });
  } catch (err) {
    console.error("create-payment:", err);
    return json({ error: err instanceof Error ? err.message : "Erro interno" }, 500);
  }
});
