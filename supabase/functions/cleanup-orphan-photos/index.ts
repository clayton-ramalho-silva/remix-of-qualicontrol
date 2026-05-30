import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Lista todos os objetos de um bucket (paginado).
 */
async function listAllObjects(
  admin: ReturnType<typeof createClient>,
  bucket: string,
  prefix = "",
): Promise<{ name: string; created_at?: string }[]> {
  const all: { name: string; created_at?: string }[] = [];
  const limit = 1000;
  let offset = 0;
  // Loop por pasta raiz; storage.list não recursivo, então fazemos BFS leve
  const queue: string[] = [prefix];
  while (queue.length) {
    const folder = queue.shift()!;
    offset = 0;
    while (true) {
      const { data, error } = await admin.storage
        .from(bucket)
        .list(folder, { limit, offset, sortBy: { column: "name", order: "asc" } });
      if (error) throw error;
      if (!data || data.length === 0) break;
      for (const it of data) {
        const full = folder ? `${folder}/${it.name}` : it.name;
        if (it.id === null && !it.metadata) {
          // pasta
          queue.push(full);
        } else {
          all.push({ name: full, created_at: it.created_at });
        }
      }
      if (data.length < limit) break;
      offset += limit;
    }
  }
  return all;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Apenas admins podem rodar
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE);
    const { data: isAdmin } = await admin.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "admin",
    });
    if (!isAdmin) return json({ error: "Forbidden: admin only" }, 403);

    const BUCKETS = ["evidencias", "plantas"];
    const MIN_AGE_HOURS = 24;
    const cutoff = Date.now() - MIN_AGE_HOURS * 3600 * 1000;

    // Carrega todas as referências conhecidas em paralelo
    const tables: { table: string; col: string }[] = [
      { table: "fotos_evidencia", col: "file_key" },
      { table: "checklist_entrega_fotos", col: "url" },
      { table: "ocorrencia_fotos", col: "file_key" },
      { table: "ocorrencia_documentos", col: "file_key" },
      { table: "verificacao_resposta_fotos", col: "file_key" },
      { table: "plantas", col: "file_key" },
    ];

    const referenced = new Set<string>();
    for (const { table, col } of tables) {
      let from = 0;
      const pageSize = 1000;
      while (true) {
        const { data, error } = await admin
          .from(table)
          .select(col)
          .range(from, from + pageSize - 1);
        if (error) {
          console.warn(`falha lendo ${table}.${col}`, error.message);
          break;
        }
        if (!data || data.length === 0) break;
        for (const row of data as Record<string, unknown>[]) {
          const v = row[col];
          if (typeof v === "string" && v) {
            // extrai só o path do bucket caso seja URL completa
            const key = v.includes("/storage/v1/object/")
              ? v.split("/storage/v1/object/").pop()!.split("?")[0].replace(/^(public|sign|authenticated)\//, "").split("/").slice(1).join("/")
              : v;
            referenced.add(key);
          }
        }
        if (data.length < pageSize) break;
        from += pageSize;
      }
    }

    let marked = 0;
    const perBucket: Record<string, number> = {};

    for (const bucket of BUCKETS) {
      const objects = await listAllObjects(admin, bucket).catch((e) => {
        console.warn(`falha listando ${bucket}`, e?.message);
        return [];
      });
      const orphans: { bucket: string; file_key: string }[] = [];
      for (const obj of objects) {
        const created = obj.created_at ? Date.parse(obj.created_at) : 0;
        if (created && created > cutoff) continue; // muito novo
        if (referenced.has(obj.name)) continue;
        orphans.push({ bucket, file_key: obj.name });
      }
      if (orphans.length > 0) {
        const { error } = await admin
          .from("storage_orphans")
          .upsert(orphans, { onConflict: "bucket,file_key", ignoreDuplicates: true });
        if (error) console.warn(`upsert storage_orphans falhou`, error.message);
      }
      perBucket[bucket] = orphans.length;
      marked += orphans.length;
    }

    return json({ ok: true, marked, perBucket, scanned_buckets: BUCKETS });
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message || "internal error" }, 500);
  }
});
