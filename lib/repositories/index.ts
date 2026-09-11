"use client";

import { useMemo } from "react";
import { criarRepositoriesLocal } from "@/lib/repositories/local";
import type { Repositories } from "@/lib/repositories/types";

export type { Repositories } from "@/lib/repositories/types";
export * from "@/lib/domain/entities";

/**
 * Ponto unico de escolha do adapter de persistencia. Hoje sempre devolve o
 * adapter LocalStorage (fase de validacao do MVP, sem projeto Supabase
 * provisionado). Quando o Supabase definitivo existir, a troca e feita
 * aqui — implementando um `criarRepositoriesSupabase(): Repositories` em
 * lib/repositories/supabase/ (mesma interface de lib/repositories/types.ts,
 * usando os clientes/migrations ja preparados em lib/supabase e
 * supabase/migrations/) e alternando com base em hasSupabaseConfig().
 * Nenhuma tela ou regra de negocio muda nessa troca — todas dependem so de
 * `Repositories`.
 */
let instancia: Repositories | null = null;

export function getRepositories(): Repositories {
  if (!instancia) {
    instancia = criarRepositoriesLocal();
  }
  return instancia;
}

/** Hook de conveniencia para uso em componentes client. */
export function useRepositories(): Repositories {
  return useMemo(() => getRepositories(), []);
}
