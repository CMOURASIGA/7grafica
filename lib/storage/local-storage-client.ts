"use client";

// Unico ponto de contato com window.localStorage em todo o app. Nenhum
// componente ou repositorio deve chamar localStorage diretamente — sempre
// atraves das funcoes abaixo. Isso mantem a troca futura para o adapter
// Supabase possivel sem tocar em UI/regra de negocio: o dia em que
// lib/repositories/index.ts passar a devolver um SupabaseRepositories, este
// arquivo simplesmente deixa de ser importado.

const NAMESPACE = "7grafica";

function chaveCompleta(chave: string): string {
  return `${NAMESPACE}:${chave}`;
}

function storageDisponivel(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function lerColecao<T>(chave: string, valorPadrao: T[] = []): T[] {
  if (!storageDisponivel()) return valorPadrao;
  try {
    const bruto = window.localStorage.getItem(chaveCompleta(chave));
    if (!bruto) return valorPadrao;
    return JSON.parse(bruto) as T[];
  } catch {
    return valorPadrao;
  }
}

export function gravarColecao<T>(chave: string, valores: T[]): void {
  if (!storageDisponivel()) return;
  try {
    window.localStorage.setItem(chaveCompleta(chave), JSON.stringify(valores));
  } catch {
    // Quota excedida ou navegador em modo privado: falha silenciosa,
    // consistente com o restante do app (persistencia local e best-effort).
  }
}

export function lerValor<T>(chave: string, valorPadrao: T | null = null): T | null {
  if (!storageDisponivel()) return valorPadrao;
  try {
    const bruto = window.localStorage.getItem(chaveCompleta(chave));
    if (bruto === null) return valorPadrao;
    return JSON.parse(bruto) as T;
  } catch {
    return valorPadrao;
  }
}

export function gravarValor<T>(chave: string, valor: T): void {
  if (!storageDisponivel()) return;
  try {
    window.localStorage.setItem(chaveCompleta(chave), JSON.stringify(valor));
  } catch {
    // idem gravarColecao
  }
}

export function removerChave(chave: string): void {
  if (!storageDisponivel()) return;
  window.localStorage.removeItem(chaveCompleta(chave));
}

/** SPEC 08: grava o agregado de estoque/compra de uma vez e propaga falha de quota. */
export function gravarValorConfirmado<T>(chave: string, valor: T): void {
  if (!storageDisponivel()) throw new Error("Armazenamento local indisponível. Nenhuma movimentação foi confirmada.");
  try { window.localStorage.setItem(chaveCompleta(chave), JSON.stringify(valor)); }
  catch { throw new Error("Não foi possível salvar. Verifique o espaço do navegador e tente novamente."); }
}

/** Remove todas as chaves do namespace 7grafica — usado por "restaurar dados de demonstracao". */
export function limparNamespace(): void {
  if (!storageDisponivel()) return;
  const prefixo = `${NAMESPACE}:`;
  const chaves: string[] = [];
  for (let i = 0; i < window.localStorage.length; i += 1) {
    const chave = window.localStorage.key(i);
    if (chave?.startsWith(prefixo)) chaves.push(chave);
  }
  chaves.forEach((chave) => window.localStorage.removeItem(chave));
}

export function gerarId(prefixo: string): string {
  return `${prefixo}-${Math.random().toString(36).slice(2, 10)}`;
}
