import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { formatBRL, type Categoria, type Produto } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { LogOut, Pencil, Plus, Trash2 } from "lucide-react";

export default function Admin() {
  const navigate = useNavigate();
  const { session, isAdmin, loading } = useAuth();
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);

  useEffect(() => {
    if (!loading && !session) navigate("/login", { replace: true });
  }, [session, loading, navigate]);

  const load = async () => {
    const [{ data: c }, { data: p }] = await Promise.all([
      supabase.from("categorias").select("*").order("ordem"),
      supabase.from("produtos").select("*").order("ordem"),
    ]);
    setCategorias(c || []);
    setProdutos(p || []);
  };

  useEffect(() => {
    if (session && isAdmin) load();
  }, [session, isAdmin]);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  if (loading) return <div className="p-8">Carregando...</div>;
  if (!session) return null;
  if (!isAdmin)
    return (
      <div className="min-h-screen grid place-items-center p-4">
        <Card className="p-6 text-center max-w-md">
          <h2 className="text-xl font-bold mb-2">Acesso negado</h2>
          <p className="text-muted-foreground mb-4">
            Sua conta não tem permissão de administrador.
          </p>
          <Button onClick={signOut} variant="outline">Sair</Button>
        </Card>
      </div>
    );

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Painel Admin</h1>
            <p className="text-sm text-muted-foreground">{session.user.email}</p>
          </div>
          <div className="flex gap-2">
            <Link to="/">
              <Button variant="outline" size="sm">Ver cardápio</Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="w-4 h-4 mr-1" /> Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <Tabs defaultValue="produtos">
          <TabsList>
            <TabsTrigger value="produtos">Produtos</TabsTrigger>
            <TabsTrigger value="categorias">Categorias</TabsTrigger>
          </TabsList>

          <TabsContent value="produtos" className="mt-4">
            <ProdutosPanel produtos={produtos} categorias={categorias} reload={load} />
          </TabsContent>
          <TabsContent value="categorias" className="mt-4">
            <CategoriasPanel categorias={categorias} reload={load} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

/* ============= Categorias ============= */
function CategoriasPanel({
  categorias,
  reload,
}: {
  categorias: Categoria[];
  reload: () => void;
}) {
  const [nome, setNome] = useState("");
  const [ordem, setOrdem] = useState(0);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("categorias").insert({ nome, ordem });
    if (error) toast.error(error.message);
    else {
      toast.success("Categoria criada");
      setNome("");
      setOrdem(0);
      reload();
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir categoria?")) return;
    const { error } = await supabase.from("categorias").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Excluída");
      reload();
    }
  };

  const updateNome = async (id: string, nome: string) => {
    const { error } = await supabase.from("categorias").update({ nome }).eq("id", id);
    if (error) toast.error(error.message);
    else reload();
  };
  const updateOrdem = async (id: string, ordem: number) => {
    const { error } = await supabase.from("categorias").update({ ordem }).eq("id", id);
    if (error) toast.error(error.message);
    else reload();
  };

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <form onSubmit={add} className="flex flex-col sm:flex-row gap-2 items-end">
          <div className="flex-1">
            <Label>Nome</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} required />
          </div>
          <div className="w-24">
            <Label>Ordem</Label>
            <Input
              type="number"
              value={ordem}
              onChange={(e) => setOrdem(Number(e.target.value))}
            />
          </div>
          <Button type="submit"><Plus className="w-4 h-4 mr-1" /> Adicionar</Button>
        </form>
      </Card>

      <div className="space-y-2">
        {categorias.map((c) => (
          <Card key={c.id} className="p-3 flex items-center gap-3">
            <Input
              defaultValue={c.nome}
              onBlur={(e) => e.target.value !== c.nome && updateField(c.id, "nome", e.target.value)}
              className="flex-1"
            />
            <Input
              type="number"
              defaultValue={c.ordem}
              onBlur={(e) =>
                Number(e.target.value) !== c.ordem &&
                updateField(c.id, "ordem", Number(e.target.value))
              }
              className="w-20"
            />
            <Button variant="ghost" size="icon" onClick={() => remove(c.id)}>
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ============= Produtos ============= */
function ProdutosPanel({
  produtos,
  categorias,
  reload,
}: {
  produtos: Produto[];
  categorias: Categoria[];
  reload: () => void;
}) {
  const [editing, setEditing] = useState<Produto | null>(null);
  const [open, setOpen] = useState(false);

  const openNew = () => {
    setEditing({
      id: "",
      nome: "",
      descricao: "",
      preco: 0,
      imagem: "",
      categoria_id: categorias[0]?.id || null,
      ativo: true,
      ordem: 0,
    });
    setOpen(true);
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir produto?")) return;
    const { error } = await supabase.from("produtos").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Excluído");
      reload();
    }
  };

  const toggleAtivo = async (p: Produto) => {
    const { error } = await supabase
      .from("produtos")
      .update({ ativo: !p.ativo })
      .eq("id", p.id);
    if (error) toast.error(error.message);
    else reload();
  };

  const updatePreco = async (id: string, preco: number) => {
    const { error } = await supabase.from("produtos").update({ preco }).eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Preço atualizado");
      reload();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openNew}>
          <Plus className="w-4 h-4 mr-1" /> Novo produto
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {produtos.map((p) => (
          <Card key={p.id} className="p-3 flex gap-3">
            <img
              src={p.imagem || "https://via.placeholder.com/80"}
              alt={p.nome}
              className="w-20 h-20 rounded object-cover bg-muted"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-semibold truncate">{p.nome}</h3>
                  <p className="text-xs text-muted-foreground truncate">{p.descricao}</p>
                </div>
                <Switch checked={p.ativo} onCheckedChange={() => toggleAtivo(p)} />
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-muted-foreground">R$</span>
                <Input
                  type="number"
                  step="0.01"
                  defaultValue={Number(p.preco)}
                  onBlur={(e) => {
                    const v = Number(e.target.value);
                    if (v !== Number(p.preco)) updatePreco(p.id, v);
                  }}
                  className="h-8 w-24"
                />
                <span className="text-xs text-muted-foreground">
                  ({formatBRL(Number(p.preco))})
                </span>
                <div className="ml-auto flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setEditing(p);
                      setOpen(true);
                    }}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => remove(p.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <ProdutoDialog
        open={open}
        onOpenChange={setOpen}
        produto={editing}
        categorias={categorias}
        onSaved={reload}
      />
    </div>
  );
}

function ProdutoDialog({
  open,
  onOpenChange,
  produto,
  categorias,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  produto: Produto | null;
  categorias: Categoria[];
  onSaved: () => void;
}) {
  const [form, setForm] = useState<Produto | null>(produto);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(produto);
  }, [produto]);

  if (!form) return null;

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error: upErr } = await supabase.storage.from("produtos").upload(path, file);
    if (upErr) {
      toast.error(upErr.message);
      setUploading(false);
      return;
    }
    const { data } = supabase.storage.from("produtos").getPublicUrl(path);
    setForm({ ...form, imagem: data.publicUrl });
    setUploading(false);
    toast.success("Imagem enviada");
  };

  const save = async () => {
    setSaving(true);
    const payload = {
      nome: form.nome,
      descricao: form.descricao,
      preco: Number(form.preco),
      imagem: form.imagem,
      categoria_id: form.categoria_id,
      ativo: form.ativo,
      ordem: form.ordem,
    };
    const { error } = form.id
      ? await supabase.from("produtos").update(payload).eq("id", form.id)
      : await supabase.from("produtos").insert(payload);
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Salvo");
      onOpenChange(false);
      onSaved();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{form.id ? "Editar produto" : "Novo produto"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Nome</Label>
            <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea
              rows={2}
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Preço (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.preco}
                onChange={(e) => setForm({ ...form, preco: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>Ordem</Label>
              <Input
                type="number"
                value={form.ordem}
                onChange={(e) => setForm({ ...form, ordem: Number(e.target.value) })}
              />
            </div>
          </div>
          <div>
            <Label>Categoria</Label>
            <Select
              value={form.categoria_id || ""}
              onValueChange={(v) => setForm({ ...form, categoria_id: v })}
            >
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {categorias.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Imagem</Label>
            {form.imagem && (
              <img
                src={form.imagem}
                alt=""
                className="w-full h-32 object-cover rounded my-2 bg-muted"
              />
            )}
            <Input type="file" accept="image/*" onChange={handleUpload} disabled={uploading} />
            <Input
              className="mt-2"
              placeholder="ou cole uma URL"
              value={form.imagem}
              onChange={(e) => setForm({ ...form, imagem: e.target.value })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>Ativo no cardápio</Label>
            <Switch
              checked={form.ativo}
              onCheckedChange={(v) => setForm({ ...form, ativo: v })}
            />
          </div>
          <Button onClick={save} disabled={saving || uploading} className="w-full">
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
