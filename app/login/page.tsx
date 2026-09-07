"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BrandLockup } from "@/components/brand/brand-lockup";
import { useSessao } from "@/components/providers/session-provider";
import { usuariosPerfilSeed, SENHA_DEMO } from "@/lib/mock/seed-data";
import { PAPEL_LABEL } from "@/lib/rbac";

// Papel de cada usuario de demonstracao, so para exibir na tela de login —
// nao e usado para autenticar (isso e responsabilidade de repositories.sessao).
const PAPEL_POR_USUARIO: Record<string, string> = {
  "usuario-admin": PAPEL_LABEL.admin,
  "usuario-gerente": PAPEL_LABEL.gerente,
  "usuario-atendente": PAPEL_LABEL.atendente,
  "usuario-operador": PAPEL_LABEL.operador,
};

export default function LoginPage() {
  const router = useRouter();
  const { sessao, carregando, entrar } = useSessao();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!carregando && sessao) {
      router.replace("/");
    }
  }, [carregando, sessao, router]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      await entrar(email, senha);
      router.replace("/");
    } catch (err) {
      setErro(err instanceof Error ? err.message : "E-mail ou senha invalidos.");
    } finally {
      setEnviando(false);
    }
  }

  function preencherDemo(usuarioEmail: string) {
    setEmail(usuarioEmail);
    setSenha(SENHA_DEMO);
    setErro(null);
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center px-4 py-10">
      <section className="w-full rounded-[1.8rem] border border-(--border) bg-(--bg-surface) p-8 shadow-[var(--shadow-card)]">
        <div className="flex justify-center">
          <BrandLockup align="center" size="lg" description={null} />
        </div>
        <div className="mt-6 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-(--accent)">Acesso ao sistema</p>
          <h1 className="mt-2 text-2xl font-semibold text-(--text-primary)">Entrar</h1>
          <p className="mt-2 text-sm leading-6 text-(--text-secondary)">
            Use as credenciais da sua gráfica para acessar o workspace operacional.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <div>
            <label className="workspace-label" htmlFor="email">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              className="workspace-input"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <div>
            <label className="workspace-label" htmlFor="senha">
              Senha
            </label>
            <input
              id="senha"
              type="password"
              autoComplete="current-password"
              required
              className="workspace-input"
              value={senha}
              onChange={(event) => setSenha(event.target.value)}
            />
          </div>
          {erro ? <p className="field-error">{erro}</p> : null}
          <button type="submit" disabled={enviando} className="workspace-button-primary">
            {enviando ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <div className="mt-6 rounded-xl border border-(--border) bg-(--bg-muted) p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-(--text-tertiary)">
            Ambiente de demonstracao (dados locais)
          </p>
          <p className="mt-1 text-xs text-(--text-secondary)">
            Sem Supabase provisionado ainda: os dados vivem no navegador. Senha para todos: <strong>{SENHA_DEMO}</strong>
          </p>
          <div className="mt-3 flex flex-col gap-1.5">
            {usuariosPerfilSeed.map((usuario) => (
              <button
                key={usuario.id}
                type="button"
                onClick={() => preencherDemo(usuario.email)}
                className="flex items-center justify-between rounded-lg border border-(--border) bg-white px-3 py-2 text-left text-xs transition hover:border-(--accent)"
              >
                <span className="font-medium text-(--text-primary)">{usuario.nome}</span>
                <span className="text-(--text-tertiary)">{PAPEL_POR_USUARIO[usuario.id]}</span>
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
