"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useRepositories } from "@/lib/repositories";

function Formulario() {
  const repos = useRepositories(), router = useRouter(), params = useSearchParams(), convite = params.get("convite");
  const [email, setEmail] = useState(""), [senha, setSenha] = useState(""), [erro, setErro] = useState<string | null>(null), [ocupado, setOcupado] = useState(false);
  async function enviar() { setOcupado(true); setErro(null); try { if (convite) await repos.portalCliente.ativarConta(convite, senha); else await repos.portalCliente.entrar(email, senha); router.replace("/portal/cliente"); } catch (e) { setErro(e instanceof Error ? e.message : "Não foi possível entrar."); } finally { setOcupado(false); } }
  return <main className="mx-auto flex min-h-screen max-w-md items-center px-4 py-10"><section className="w-full rounded-[1.8rem] border border-(--border) bg-white p-6 shadow-[var(--shadow-card)]"><p className="text-[10px] font-black uppercase tracking-[0.24em] text-(--accent)">7Grafica</p><h1 className="mt-2 text-2xl font-semibold">{convite ? "Ativar conta" : "Portal do cliente"}</h1><p className="mt-2 text-sm text-(--text-secondary)">{convite ? "Defina sua senha para acessar todos os pedidos vinculados ao seu cliente." : "Entre para acompanhar pedidos, arquivos, orçamentos e pagamentos."}</p><div className="mt-5 space-y-3">{!convite ? <div><label htmlFor="portal-login-email" className="workspace-label">E-mail</label><input id="portal-login-email" type="email" className="workspace-input" value={email} onChange={(e) => setEmail(e.target.value)} /></div> : null}<div><label htmlFor="portal-login-senha" className="workspace-label">Senha</label><input id="portal-login-senha" type="password" className="workspace-input" value={senha} onChange={(e) => setSenha(e.target.value)} /></div>{erro ? <p role="alert" className="text-sm text-red-700">{erro}</p> : null}<button disabled={ocupado} className="workspace-button-primary w-full" onClick={() => void enviar()}>{convite ? "Ativar e entrar" : "Entrar"}</button></div></section></main>;
}
export default function PortalAcessoPage() { return <Suspense><Formulario /></Suspense>; }
