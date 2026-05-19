export type Categoria = {
  id: string;
  nome: string;
  ordem: number;
};

export type Produto = {
  id: string;
  nome: string;
  descricao: string;
  preco: number;
  imagem: string;
  categoria_id: string | null;
  ativo: boolean;
  ordem: number;
};

export type CartItem = {
  id: string;
  nome: string;
  descricao?: string;
  preco: number;
  imagem: string;
  qty: number;
};

export const WHATSAPP = "5598984940944";

export const formatBRL = (v: number) =>
  Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
