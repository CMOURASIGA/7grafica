"use client";

import { useTransition } from "react";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { useRepositoriosAutorizados as useRepositories, useSessao } from "@/components/providers/session-provider";
import { PAPEL_LABEL } from "@/lib/rbac";
import type { Papel } from "@/lib/domain/entities";
import type { VinculoComPerfil } from "@/lib/repositories/types";

const PAPEIS: Papel[] = ["admin", "gerente", "atendente", "operador"];

export function UsuariosTable({ vinculos, onAtualizado }: { vinculos: VinculoComPerfil[]; onAtualizado: () => void }) {
  const repositories = useRepositories();
  const { sessao } = useSessao();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [pending, startTransition] = useTransition();

  function handlePapelChange(vinculoId: string, papel: Papel) {
    startTransition(async () => {
      try {
        await repositories.usuarios.alterarPapel(vinculoId, papel);
        await repositories.auditoria.registrar({
          empresaId: sessao!.empresaAtiva!.id,
          usuarioId: sessao!.usuario.id,
          acao: "empresa_usuarios.alterar_papel",
          entidade: "empresa_usuarios",
          entidadeId: vinculoId,
          dadosAntes: null,
          dadosDepois: { papel },
        });
        showToast("Papel atualizado.", "success");
        onAtualizado();
      } catch (erro) {
        showToast(erro instanceof Error ? erro.message : "Falha ao salvar.", "error");
      }
    });
  }

  async function handleToggleAtivo(vinculo: VinculoComPerfil) {
    if (vinculo.ativo) {
      const ok = await confirm({
        title: `Desativar acesso de ${vinculo.perfil?.nome || vinculo.perfil?.email || "usuario"}?`,
        description: "O usuario perde o acesso a esta empresa imediatamente. Voce pode reativar depois.",
        confirmLabel: "Desativar",
        tone: "danger",
      });
      if (!ok) return;
    }

    startTransition(async () => {
      try {
        await repositories.usuarios.definirAtivo(vinculo.id, !vinculo.ativo);
        await repositories.auditoria.registrar({
          empresaId: sessao!.empresaAtiva!.id,
          usuarioId: sessao!.usuario.id,
          acao: vinculo.ativo ? "empresa_usuarios.desativar" : "empresa_usuarios.reativar",
          entidade: "empresa_usuarios",
          entidadeId: vinculo.id,
          dadosAntes: null,
          dadosDepois: { ativo: !vinculo.ativo },
        });
        showToast("Acesso atualizado.", "success");
        onAtualizado();
      } catch (erro) {
        showToast(erro instanceof Error ? erro.message : "Falha ao salvar.", "error");
      }
    });
  }

  if (vinculos.length === 0) {
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
          {vinculos.map((vinculo) => {
            const souEu = vinculo.usuarioId === sessao?.usuario.id;
            return (
              <tr key={vinculo.id}>
                <td className="border-b border-(--border) py-3 pr-4">
                  <p className="font-medium text-(--text-primary)">{vinculo.perfil?.nome || "Sem nome"}</p>
                  <p className="text-xs text-(--text-secondary)">{vinculo.perfil?.email ?? "—"}</p>
                </td>
                <td className="border-b border-(--border) py-3 pr-4">
                  <select
                    className="workspace-select"
                    defaultValue={vinculo.papel}
                    disabled={pending || souEu}
                    onChange={(event) => handlePapelChange(vinculo.id, event.target.value as Papel)}
                  >
                    {PAPEIS.map((papel) => (
                      <option key={papel} value={papel}>
                        {PAPEL_LABEL[papel]}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="border-b border-(--border) py-3 pr-4">
                  <span className={`workspace-pill ${vinculo.ativo ? "workspace-pill-success" : "workspace-pill-danger"}`}>
                    {vinculo.ativo ? "Ativo" : "Inativo"}
                  </span>
                </td>
                <td className="border-b border-(--border) py-3 pr-4 text-right">
                  <button
                    type="button"
                    disabled={pending || souEu}
                    onClick={() => void handleToggleAtivo(vinculo)}
                    className={vinculo.ativo ? "workspace-button-danger" : "workspace-button-secondary"}
                  >
                    {vinculo.ativo ? "Desativar" : "Reativar"}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
