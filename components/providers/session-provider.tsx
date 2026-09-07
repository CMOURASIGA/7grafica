"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { garantirDadosDemo } from "@/lib/mock/reset";
import { getRepositories } from "@/lib/repositories";
import { protegerRepositories } from "@/lib/repositories/authorization";
import type { Repositories, SessaoAtual } from "@/lib/repositories/types";

type SessionContextValue = {
  carregando: boolean;
  sessao: SessaoAtual | null;
  entrar: (email: string, senha: string) => Promise<void>;
  sair: () => Promise<void>;
  recarregar: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

/**
 * Fonte da verdade de "quem esta logado" para todo o app no modo MVP/local.
 * Le/escreve exclusivamente via lib/repositories (nunca localStorage
 * direto). Quando o adapter Supabase entrar, esta mesma interface passa a
 * refletir client.auth.onAuthStateChange por baixo — nenhum consumidor de
 * useSessao() muda.
 */
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [carregando, setCarregando] = useState(true);
  const [sessao, setSessao] = useState<SessaoAtual | null>(null);

  const recarregar = useCallback(async () => {
    const repositories = getRepositories();
    const atual = await repositories.sessao.obterAtual();
    setSessao(atual);
  }, []);

  useEffect(() => {
    garantirDadosDemo();
    void recarregar().finally(() => setCarregando(false));
  }, [recarregar]);

  const entrar = useCallback(async (email: string, senha: string) => {
    const repositories = getRepositories();
    const atual = await repositories.sessao.entrar(email, senha);
    setSessao(atual);
  }, []);

  const sair = useCallback(async () => {
    const repositories = getRepositories();
    await repositories.sessao.sair();
    setSessao(null);
  }, []);

  return (
    <SessionContext.Provider value={{ carregando, sessao, entrar, sair, recarregar }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSessao(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSessao deve ser usado dentro de SessionProvider.");
  }
  return context;
}

/**
 * Repositorios com RBAC dos Cadastros aplicado ao papel do usuario logado
 * na empresa ativa. Use este hook (nao useRepositories) em qualquer tela
 * que leia/escreva clientes, contatos, e-mails ou os demais cadastros
 * mestres — a checagem de permissao acontece a cada chamada, nao so na UI.
 */
export function useRepositoriosAutorizados(): Repositories {
  const { sessao } = useSessao();
  const papel = sessao?.empresaAtiva?.papel ?? null;
  return useMemo(() => protegerRepositories(getRepositories(), papel), [papel]);
}
