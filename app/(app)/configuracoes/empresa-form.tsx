"use client";

import { useState, useTransition } from "react";
import { atualizarEmpresaAction } from "./actions";
import { useToast } from "@/components/ui/toast";
import type { Empresa } from "@/lib/supabase/types";

export function EmpresaForm({ empresa }: { empresa: Empresa }) {
  const { showToast } = useToast();
  const [pending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setErro(null);
    startTransition(async () => {
      const resultado = await atualizarEmpresaAction(formData);
      if (resultado.ok) {
        showToast("Dados da empresa atualizados.", "success");
      } else {
        setErro(resultado.erro);
        showToast(resultado.erro, "error");
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
        <input id="logo_url" name="logo_url" defaultValue={empresa.logo_url ?? ""} placeholder="https://..." className="workspace-input" />
        <p className="mt-1 text-xs text-(--text-tertiary)">
          Quando preenchido, substitui a identidade Consult Services no canto superior esquerdo.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="workspace-label" htmlFor="cor_primaria">
            Cor primaria
          </label>
          <input id="cor_primaria" name="cor_primaria" defaultValue={empresa.cor_primaria ?? ""} placeholder="#003b73" className="workspace-input" />
        </div>
        <div>
          <label className="workspace-label" htmlFor="cor_destaque">
            Cor de destaque
          </label>
          <input id="cor_destaque" name="cor_destaque" defaultValue={empresa.cor_destaque ?? ""} placeholder="#00aeef" className="workspace-input" />
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
