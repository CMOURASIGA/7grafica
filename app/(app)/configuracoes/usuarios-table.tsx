"use client";

import { useTransition } from "react";
import { alterarPapelUsuarioAction, alternarAtivoUsuarioAction } from "./actions";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { PAPEL_LABEL } from "@/lib/rbac";
import type { Papel } from "@/lib/supabase/types";

export type LinhaUsuario = {
  vinculoId: string;
  nome: string;
  email: string | null;
  papel: Papel;
  ativo: boolean;
  souEu: boolean;
};

const PAPEIS: Papel[] = ["admin", "gerente", "atendente", "operador"];

export function UsuariosTable({ linhas }: { linhas: LinhaUsuario[] }) {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [pending, startTransition] = useTransition();

  function handlePapelChange(vinculoId: string, papel: Papel) {
    startTransition(async () => {
      const resultado = await alterarPapelUsuarioAction(vinculoId, papel);
      showToast(resultado.ok ? "Papel atualizado." : resultado.erro, resultado.ok ? "success" : "error");
    });
  }

  async function handleToggleAtivo(linha: LinhaUsuario) {
    if (linha.ativo) {
      const ok = await confirm({
        title: `Desativar acesso de ${linha.nome || linha.email || "usuario"}?`,
        description: "O usuario perde o acesso a esta empresa imediatamente. Voce pode reativar depois.",
        confirmLabel: "Desativar",
        tone: "danger",
      });
      if (!ok) return;
    }

    startTransition(async () => {
      const resultado = await alternarAtivoUsuarioAction(linha.vinculoId, !linha.ativo);
      showToast(resultado.ok ? "Acesso atualizado." : resultado.erro, resultado.ok ? "success" : "error");
    });
  }

  if (linhas.length === 0) {
    return <p className="workspace-empty-state">Nenhum usuario vinculado a esta empresa ainda.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] border-collapse text-sm">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wide text-(--text-tertiary)">
            <th className="border-b border-(--border) py-2 pr-4">Usuario</th>
            <th className="border-b border-(--border) py-2 pr-4">Papel</th>
            <th className="border-b border-(--border) py-2 pr-4">Status</th>
            <th className="border-b border-(--border) py-2 pr-4" />
          </tr>
        </thead>
        <tbody>
          {linhas.map((linha) => (
            <tr key={linha.vinculoId}>
              <td className="border-b border-(--border) py-3 pr-4">
                <p className="font-medium text-(--text-primary)">{linha.nome || "Sem nome"}</p>
                <p className="text-xs text-(--text-secondary)">{linha.email ?? "—"}</p>
              </td>
              <td className="border-b border-(--border) py-3 pr-4">
                <select
                  className="workspace-select"
                  defaultValue={linha.papel}
                  disabled={pending || linha.souEu}
                  onChange={(event) => handlePapelChange(linha.vinculoId, event.target.value as Papel)}
                >
                  {PAPEIS.map((papel) => (
                    <option key={papel} value={papel}>
                      {PAPEL_LABEL[papel]}
                    </option>
                  ))}
                </select>
              </td>
              <td className="border-b border-(--border) py-3 pr-4">
                <span className={`workspace-pill ${linha.ativo ? "workspace-pill-success" : "workspace-pill-danger"}`}>
                  {linha.ativo ? "Ativo" : "Inativo"}
                </span>
              </td>
              <td className="border-b border-(--border) py-3 pr-4 text-right">
                <button
                  type="button"
                  disabled={pending || linha.souEu}
                  onClick={() => void handleToggleAtivo(linha)}
                  className={linha.ativo ? "workspace-button-danger" : "workspace-button-secondary"}
                >
                  {linha.ativo ? "Desativar" : "Reativar"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
