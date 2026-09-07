"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BrandLockup } from "@/components/brand/brand-lockup";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [nextPath, setNextPath] = useState("/");
  const [semSupabase, setSemSupabase] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setNextPath(params.get("next")?.trim() || "/");
    setSemSupabase(!getSupabaseBrowserClient());
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setErro(null);
    const client = getSupabaseBrowserClient();
    if (!client) {
      setErro("Supabase nao esta configurado neste ambiente.");
      return;
    }

    setEnviando(true);
    const { error } = await client.auth.signInWithPassword({ email, password: senha });
    setEnviando(false);

    if (error) {
      setErro("E-mail ou senha invalidos.");
      return;
    }

    router.replace(nextPath);
    router.refresh();
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

        {semSupabase ? (
          <p className="mt-6 rounded-xl border border-(--warning) bg-(--warning-soft) px-4 py-3 text-sm text-(--warning)">
            Supabase nao configurado neste ambiente (variaveis NEXT_PUBLIC_SUPABASE_URL /
            NEXT_PUBLIC_SUPABASE_ANON_KEY ausentes). Login indisponivel.
          </p>
        ) : (
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
        )}
      </section>
    </div>
  );
}
