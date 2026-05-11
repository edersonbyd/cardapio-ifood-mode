import { createFileRoute } from "@tanstack/react-router";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_sheets/v4";
const SPREADSHEET_ID = "1yELWMHl4AMWPbiLrJqIQ9C08zCOdruUQysWl4gu5cjQ";
const RANGE = "Cardapio!A1:F1000";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "public, max-age=60",
};

export const Route = createFileRoute("/api/menu")({
  server: {
    handlers: {
      OPTIONS: async () =>
        new Response(null, { status: 204, headers: corsHeaders }),
      GET: async () => {
        const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
        const GOOGLE_SHEETS_API_KEY = process.env.GOOGLE_SHEETS_API_KEY;
        if (!LOVABLE_API_KEY || !GOOGLE_SHEETS_API_KEY) {
          return new Response(
            JSON.stringify({ error: "Conector Google Sheets não configurado" }),
            { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } },
          );
        }

        try {
          const res = await fetch(
            `${GATEWAY_URL}/spreadsheets/${SPREADSHEET_ID}/values/${RANGE}`,
            {
              headers: {
                Authorization: `Bearer ${LOVABLE_API_KEY}`,
                "X-Connection-Api-Key": GOOGLE_SHEETS_API_KEY,
              },
            },
          );

          if (!res.ok) {
            const body = await res.text();
            return new Response(
              JSON.stringify({ error: `Sheets API ${res.status}: ${body}` }),
              { status: 502, headers: { "Content-Type": "application/json", ...corsHeaders } },
            );
          }

          const data = (await res.json()) as { values?: string[][] };
          const rows = data.values ?? [];
          if (rows.length < 2) {
            return new Response(JSON.stringify([]), {
              headers: { "Content-Type": "application/json", ...corsHeaders },
            });
          }

          const headers = rows[0].map((h) => h.trim().toLowerCase());
          const items = rows.slice(1)
            .filter((r) => r.some((c) => c && String(c).trim() !== ""))
            .map((r) => {
              const obj: Record<string, string | number> = {};
              headers.forEach((h, i) => {
                const val = r[i] ?? "";
                if (h === "preco" || h === "preço") {
                  const n = Number(String(val).replace(",", "."));
                  obj[h] = isNaN(n) ? 0 : n;
                } else {
                  obj[h] = val;
                }
              });
              return obj;
            });

          return new Response(JSON.stringify(items), {
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        } catch (err) {
          return new Response(
            JSON.stringify({ error: (err as Error).message }),
            { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } },
          );
        }
      },
    },
  },
});
