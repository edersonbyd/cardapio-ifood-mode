import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  formatBRL,
  WHATSAPP,
  type Categoria,
  type Produto,
  type CartItem,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingBag, Plus, Minus, Trash2, X, Settings } from "lucide-react";
import { toast } from "sonner";

const STORAGE_KEY = "cardapio_cart_v1";

export default function Cardapio() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [activeCat, setActiveCat] = useState<string>("Todos");
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch {
      return [];
    }
  });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [delivery, setDelivery] = useState<"retirar" | "delivery">("retirar");
  const [payment, setPayment] = useState<string>("PIX");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
  }, [cart]);

  const load = async () => {
    const [{ data: cats }, { data: prods }] = await Promise.all([
      supabase.from("categorias").select("*").order("ordem"),
      supabase.from("produtos").select("*").eq("ativo", true).order("ordem"),
    ]);
    setCategorias(cats || []);
    setProdutos(prods || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("cardapio")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "produtos" },
        load,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "categorias" },
        load,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  const catMap = useMemo(
    () => Object.fromEntries(categorias.map((c) => [c.id, c.nome])),
    [categorias],
  );

  const filtered =
    activeCat === "Todos"
      ? produtos
      : produtos.filter((p) => catMap[p.categoria_id || ""] === activeCat);

  const addToCart = (p: Produto) => {
    setCart((cur) => {
      const ex = cur.find((i) => i.id === p.id);
      if (ex) return cur.map((i) => (i.id === p.id ? { ...i, qty: i.qty + 1 } : i));
      return [
        ...cur,
        { id: p.id, nome: p.nome, preco: Number(p.preco), imagem: p.imagem, qty: 1 },
      ];
    });
    toast.success(`${p.nome} adicionado!`);
  };

  const changeQty = (id: string, d: number) => {
    setCart((cur) =>
      cur
        .map((i) => (i.id === id ? { ...i, qty: i.qty + d } : i))
        .filter((i) => i.qty > 0),
    );
  };
  const removeItem = (id: string) => setCart((cur) => cur.filter((i) => i.id !== id));

  const total = cart.reduce((s, i) => s + i.qty * i.preco, 0);
  const count = cart.reduce((s, i) => s + i.qty, 0);

  const checkout = () => {
    if (!cart.length) return;
    const lines = cart.map(
      (i) => `• ${i.nome} x${i.qty} — ${formatBRL(i.preco * i.qty)}`,
    );
    const entrega = delivery === "delivery" ? "Delivery" : "Retirar no estabelecimento";
    let msg = `*Novo Pedido* 🛍️\n\n${lines.join(
      "\n",
    )}\n\n💰 *Total: ${formatBRL(total)}*\n\n📦 Entrega: ${entrega}\n💳 Pagamento: ${payment}`;
    if (delivery === "delivery")
      msg += `\n\n📍 Por favor, informe o endereço de entrega.`;
    window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b bg-card sticky top-0 z-30 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-3xl">🧁</span>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold leading-tight truncate">Confeitaria Amanda Santos</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">Peça pelo WhatsApp</p>
            </div>
          </div>
          <Link
            to="/admin"
            className="text-muted-foreground hover:text-foreground shrink-0"
            aria-label="Admin"
          >
            <Settings className="w-5 h-5" />
          </Link>
        </div>
      </header>

      <nav className="container mx-auto px-4 py-4 flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {["Todos", ...categorias.map((c) => c.nome)].map((c) => (
          <button
            key={c}
            onClick={() => setActiveCat(c)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap border transition ${
              activeCat === c
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-card text-foreground border-border hover:border-primary"
            }`}
          >
            {c}
          </button>
        ))}
      </nav>

      <main className="container mx-auto px-4 pb-28">
        {loading ? (
          <p className="text-center py-10 text-muted-foreground">Carregando cardápio...</p>
        ) : filtered.length === 0 ? (
          <p className="text-center py-10 text-muted-foreground">Nenhum produto encontrado.</p>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
            {filtered.map((p) => (
              <article
                key={p.id}
                className="bg-card rounded-2xl overflow-hidden border shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200 flex flex-col"
              >
                <div className="aspect-[4/3] bg-muted overflow-hidden">
                  <img
                    src={p.imagem}
                    alt={p.nome}
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        "https://via.placeholder.com/400x300?text=Sem+imagem";
                    }}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-4 flex flex-col flex-1">
                  <h3 className="font-semibold text-base">{p.nome}</h3>
                  <p className="text-sm text-muted-foreground mt-1 flex-1">{p.descricao}</p>
                  <div className="flex items-center justify-between gap-2 mt-3">
                    <span className="text-base sm:text-lg font-bold text-primary truncate">
                      {formatBRL(Number(p.preco))}
                    </span>
                    <Button
                      size="icon"
                      onClick={() => addToCart(p)}
                      className="rounded-full h-9 w-9 shrink-0 sm:h-9 sm:w-auto sm:px-3 sm:rounded-md"
                      aria-label="Adicionar"
                    >
                      <Plus className="w-4 h-4" />
                      <span className="hidden sm:inline ml-1">Adicionar</span>
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      {/* FAB Ver Sacola */}
      {!drawerOpen && (
        <button
          onClick={() => setDrawerOpen(true)}
          className="fixed left-1/2 -translate-x-1/2 bottom-5 z-40 bg-primary text-primary-foreground px-6 py-3.5 rounded-full font-semibold shadow-lg hover:bg-primary/90 transition inline-flex items-center gap-2.5"
        >
          <ShoppingBag className="w-5 h-5" />
          Ver Sacola
          {count > 0 && (
            <Badge variant="secondary" className="ml-1 bg-primary-foreground text-primary">
              {count}
            </Badge>
          )}
        </button>
      )}

      {/* Drawer */}
      <aside
        className={`fixed top-0 right-0 h-full w-full sm:w-[420px] bg-card border-l z-50 shadow-2xl transition-transform ${
          drawerOpen ? "translate-x-0" : "translate-x-full"
        } flex flex-col`}
      >
        <div className="p-5 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5" />
            <h2 className="font-semibold text-lg">Minha sacola</h2>
            <Badge variant="secondary">{count}</Badge>
          </div>
          <button
            onClick={() => setDrawerOpen(false)}
            className="sm:hidden p-2 hover:bg-muted rounded"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p className="font-medium">Sua sacola está vazia</p>
              <p className="text-sm mt-1">Adicione itens do cardápio</p>
            </div>
          ) : (
            cart.map((i) => (
              <div key={i.id} className="flex gap-3 bg-muted/40 p-3 rounded-xl">
                <img
                  src={i.imagem}
                  alt={i.nome}
                  className="w-16 h-16 rounded-lg object-cover bg-muted"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      "https://via.placeholder.com/64";
                  }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-medium text-sm truncate">{i.nome}</h4>
                    <button
                      onClick={() => removeItem(i.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">{formatBRL(i.preco)} cada</p>
                  <div className="flex items-center justify-between mt-2">
                    <div className="inline-flex items-center border rounded-full bg-background">
                      <button
                        onClick={() => changeQty(i.id, -1)}
                        className="w-7 h-7 grid place-items-center"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-7 text-center text-sm font-medium">{i.qty}</span>
                      <button
                        onClick={() => changeQty(i.id, 1)}
                        className="w-7 h-7 grid place-items-center"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <span className="font-semibold text-sm">
                      {formatBRL(i.preco * i.qty)}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="border-t p-4 space-y-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">
              Como deseja receber?
            </p>
            <div className="grid grid-cols-2 gap-2">
              {(["retirar", "delivery"] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setDelivery(d)}
                  className={`p-2.5 rounded-lg text-sm border transition ${
                    delivery === d
                      ? "border-primary bg-primary/10 text-primary font-medium"
                      : "border-border"
                  }`}
                >
                  {d === "retirar" ? "Retirar no local" : "Delivery"}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Pagamento</p>
            <div className="grid grid-cols-3 gap-2">
              {["PIX", "Dinheiro", "Cartão"].map((m) => (
                <button
                  key={m}
                  onClick={() => setPayment(m)}
                  className={`p-2 rounded-lg text-xs border transition ${
                    payment === m
                      ? "border-primary bg-primary/10 text-primary font-medium"
                      : "border-border"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-between items-center pt-2">
            <span className="text-sm text-muted-foreground">Total</span>
            <span className="text-xl font-bold">{formatBRL(total)}</span>
          </div>

          <button
            onClick={() => setDrawerOpen(false)}
            className="w-full py-3 rounded-lg border-2 border-[#25D366] text-[#25D366] font-semibold hover:bg-[#25D366]/5 transition"
          >
            Voltar para pedir mais
          </button>
          <button
            disabled={!cart.length}
            onClick={checkout}
            className="w-full py-3.5 rounded-lg bg-[#25D366] text-white font-semibold shadow-md hover:bg-[#1ebe5b] disabled:opacity-50 disabled:cursor-not-allowed transition inline-flex items-center justify-center gap-2"
          >
            Finalizar Pedido pelo WhatsApp
          </button>
        </div>
      </aside>

      {drawerOpen && (
        <div
          onClick={() => setDrawerOpen(false)}
          className="hidden sm:block fixed inset-0 bg-black/40 z-40"
        />
      )}
    </div>
  );
}
