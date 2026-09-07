"use client";

import { useState, useTransition } from "react";
import { useSessao } from "@/components/providers/session-provider";
import { useRepositories } from "@/lib/repositories";
import { useToast } from "@/components/ui/toast";
import type { Empresa } from "@/lib/domain/entities";

export function EmpresaForm({ empresa }: { empresa: Empresa }) {
  const repositories = useRepositories();
  const { sessao, recarregar } = useSessao();
  const { showToast } = useToast();
  const [pending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setErro(null);
    const dadosDepois = {
      nome: String(formData.get("nome") ?? "").trim(),
      logoUrl: String(formData.get("logo_url") ?? "").trim() || null,
      corPrimaria: String(formData.get("cor_primaria") ?? "").trim() || null,
      corDestaque: String(formData.get("cor_destaque") ?? "").trim() || null,
    };
    if (!dadosDepois.nome) {
      setErro("Informe o nome da empresa.");
      return;
    }

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
        showToast("Dados da empresa atualizados.", "success");
      } catch (err) {
        const mensagem = err instanceof Error ? err.message : "Falha ao salvar.";
        setErro(mensagem);
        showToast(mensagem, "error");
      }
    });
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label className="workspace-label" htmlFor="nome">
          Nome da empresa
        </label>
        <input id="nome" name="nome" defaultValue={empresa.nome} required className="workspace-input" />
      </div>
      <div>
        <label className="workspace-label" htmlFor="logo_url">
          URL do logo (whitelabel)
        </label>
        <input id="logo_url" name="logo_url" defaultValue={empresa.logoUrl ?? ""} placeholder="https://..." className="workspace-input" />
        <p className="mt-1 text-xs text-(--text-tertiary)">
          Quando preenchido, substitui a identidade Consult Services no canto superior esquerdo. Aceita tambem uma
          imagem embutida (data:image/...).
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="workspace-label" htmlFor="cor_primaria">
            Cor primaria
          </label>
          <input id="cor_primaria" name="cor_primaria" defaultValue={empresa.corPrimaria ?? ""} placeholder="#003b73" className="workspace-input" />
        </div>
        <div>
          <label className="workspace-label" htmlFor="cor_destaque">
            Cor de destaque
          </label>
          <input id="cor_destaque" name="cor_destaque" defaultValue={empresa.corDestaque ?? ""} placeholder="#00aeef" className="workspace-input" />
        </div>
      </div>
      {erro ? <p className="field-error">{erro}</p> : null}
      <div>
        <button type="submit" disabled={pending} className="workspace-button-primary">
          {pending ? "Salvando..." : "Salvar alteracoes"}
        </button>
      </div>
    </form>
  );
}
