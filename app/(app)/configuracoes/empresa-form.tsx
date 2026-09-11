"use client";

import { type ChangeEvent, useState, useTransition } from "react";
import { useRepositoriosAutorizados as useRepositories, useSessao } from "@/components/providers/session-provider";
import { useToast } from "@/components/ui/toast";
import { CONSULT_LOGO_URL } from "@/lib/brand";
import { CORES_PADRAO, corHexValida } from "@/lib/whitelabel";
import type { Empresa } from "@/lib/domain/entities";

type IdentidadeEditavel = Pick<Empresa, "nome" | "logoUrl" | "corPrimaria" | "corDestaque">;

export function EmpresaForm({ empresa }: { empresa: Empresa }) {
  const repositories = useRepositories();
  const { sessao, recarregar } = useSessao();
  const { showToast } = useToast();
  const [pending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [arquivoNome, setArquivoNome] = useState("");
  const [identidade, setIdentidade] = useState<IdentidadeEditavel>({ nome: empresa.nome, logoUrl: empresa.logoUrl, corPrimaria: empresa.corPrimaria, corDestaque: empresa.corDestaque });

  function atualizar<K extends keyof IdentidadeEditavel>(campo: K, valor: IdentidadeEditavel[K]) {
    setErro(null);
    setIdentidade((atual) => ({ ...atual, [campo]: valor }));
  }

  function sugerirCores(logoUrl: string) {
    const imagem = new Image();
    imagem.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 48;
      const contexto = canvas.getContext("2d");
      if (!contexto) return;
      contexto.drawImage(imagem, 0, 0, 48, 48);
      const cores = new Map<string, number>();
      const pixels = contexto.getImageData(0, 0, 48, 48).data;
      for (let indice = 0; indice < pixels.length; indice += 4) {
        if (pixels[indice + 3] < 180) continue;
        const rgb = [pixels[indice], pixels[indice + 1], pixels[indice + 2]].map((valor) => Math.min(255, Math.round(valor / 32) * 32));
        const chave = rgb.join(",");
        cores.set(chave, (cores.get(chave) ?? 0) + 1);
      }
      const paleta = [...cores.entries()].sort((a, b) => b[1] - a[1]).map(([chave]) => chave.split(",").map(Number));
      const hex = (rgb: number[]) => `#${rgb.map((valor) => valor.toString(16).padStart(2, "0")).join("")}`;
      const saturada = (rgb: number[]) => Math.max(...rgb) - Math.min(...rgb) > 70;
      const primaria = paleta.find(saturada);
      const destaque = paleta.find((cor) => saturada(cor) && (!primaria || hex(cor) !== hex(primaria)));
      setIdentidade((atual) => ({ ...atual, corPrimaria: primaria ? hex(primaria) : atual.corPrimaria, corDestaque: destaque ? hex(destaque) : atual.corDestaque }));
    };
    imagem.src = logoUrl;
  }

  function selecionarLogo(evento: ChangeEvent<HTMLInputElement>) {
    const arquivo = evento.target.files?.[0];
    if (!arquivo) return;
    if (arquivo.size > 2 * 1024 * 1024) {
      setErro("A imagem deve ter no maximo 2 MB para ser armazenada neste ambiente local-first.");
      evento.target.value = "";
      return;
    }
    setArquivoNome(arquivo.name);
    const leitor = new FileReader();
    leitor.onload = () => {
      const logoUrl = String(leitor.result);
      atualizar("logoUrl", logoUrl);
      sugerirCores(logoUrl);
    };
    leitor.readAsDataURL(arquivo);
  }

  function salvar() {
    setErro(null);
    const dadosDepois = {
      nome: identidade.nome.trim(),
      logoUrl: identidade.logoUrl?.trim() || null,
      corPrimaria: corHexValida(identidade.corPrimaria),
      corDestaque: corHexValida(identidade.corDestaque),
    };
    if (!dadosDepois.nome) return setErro("Informe o nome da empresa.");
    if (identidade.corPrimaria && !dadosDepois.corPrimaria) return setErro("Informe a cor primaria no formato #003b73.");
    if (identidade.corDestaque && !dadosDepois.corDestaque) return setErro("Informe a cor de destaque no formato #00aeef.");

    startTransition(async () => {
      try {
        await repositories.empresas.atualizar(empresa.id, dadosDepois);
        await repositories.auditoria.registrar({
          empresaId: empresa.id,
          usuarioId: sessao?.usuario.id ?? null,
          acao: "empresa.atualizar",
          entidade: "empresas",
          entidadeId: empresa.id,
          dadosAntes: { nome: empresa.nome, logoUrl: empresa.logoUrl, corPrimaria: empresa.corPrimaria, corDestaque: empresa.corDestaque },
          dadosDepois,
        });
        await recarregar();
        showToast("Identidade da empresa atualizada.", "success");
      } catch (err) {
        const mensagem = err instanceof Error ? err.message : "Falha ao salvar.";
        setErro(mensagem);
        showToast(mensagem, "error");
      }
    });
  }

  function restaurarConsult() {
    setArquivoNome("");
    setIdentidade((atual) => ({ ...atual, logoUrl: null, corPrimaria: null, corDestaque: null }));
    setErro(null);
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="max-w-3xl text-sm leading-6 text-(--text-secondary)">Envie a marca do cliente para substituir a identidade Consult Services. As cores predominantes sao sugeridas automaticamente e podem ser ajustadas antes de salvar.</p>
      <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
        <div className="flex min-h-40 items-center justify-center rounded-xl border border-(--border) bg-white p-3">
          <img src={identidade.logoUrl || CONSULT_LOGO_URL} alt={`Previa da identidade de ${identidade.nome || "empresa"}`} className="max-h-36 max-w-full object-contain" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className="workspace-label" htmlFor="nome">Nome exibido</label><input id="nome" value={identidade.nome} onChange={(evento) => atualizar("nome", evento.target.value)} className="workspace-input" /></div>
          <div><span className="workspace-label">Logo do cliente</span><label className="mt-1 flex min-h-12 cursor-pointer flex-wrap items-center gap-2 rounded-xl border border-(--border) bg-white px-3 py-2"><span className="workspace-button-secondary">Escolher arquivo</span><span className="text-xs text-(--text-secondary)">{arquivoNome || "PNG, JPG, WEBP ou SVG, ate 2 MB"}</span><input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={selecionarLogo} className="sr-only" /></label></div>
          <div><label className="workspace-label" htmlFor="cor_primaria">Cor primaria</label><div className="flex gap-2"><input type="color" aria-label="Selecionar cor primaria" value={corHexValida(identidade.corPrimaria) ?? CORES_PADRAO.primaria} onChange={(evento) => atualizar("corPrimaria", evento.target.value)} className="h-12 w-14 cursor-pointer rounded-xl border border-(--border) bg-white p-1" /><input id="cor_primaria" value={identidade.corPrimaria ?? ""} onChange={(evento) => atualizar("corPrimaria", evento.target.value)} placeholder={CORES_PADRAO.primaria} className="workspace-input" /></div></div>
          <div><label className="workspace-label" htmlFor="cor_destaque">Cor de destaque</label><div className="flex gap-2"><input type="color" aria-label="Selecionar cor de destaque" value={corHexValida(identidade.corDestaque) ?? CORES_PADRAO.destaque} onChange={(evento) => atualizar("corDestaque", evento.target.value)} className="h-12 w-14 cursor-pointer rounded-xl border border-(--border) bg-white p-1" /><input id="cor_destaque" value={identidade.corDestaque ?? ""} onChange={(evento) => atualizar("corDestaque", evento.target.value)} placeholder={CORES_PADRAO.destaque} className="workspace-input" /></div></div>
        </div>
      </div>
      {erro ? <p className="field-error">{erro}</p> : null}
      <div className="flex flex-wrap items-center gap-3"><button type="button" onClick={salvar} disabled={pending} className="workspace-button-primary">{pending ? "Salvando..." : "Salvar identidade"}</button><button type="button" onClick={restaurarConsult} disabled={pending} className="workspace-button-secondary">Restaurar Consult Services</button></div>
    </div>
  );
}
