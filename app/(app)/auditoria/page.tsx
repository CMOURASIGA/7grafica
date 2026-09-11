"use client";

import { useEffect, useState } from "react";
import { PageIntro, SurfaceCard } from "@/components/ui/workspace-primitives";
import { useRepositoriosAutorizados as useRepositories, useSessao } from "@/components/providers/session-provider";
import { papelTemPermissao, PERMISSOES } from "@/lib/rbac";
import type { EventoAuditoria } from "@/lib/domain/entities";

export default function AuditoriaPage() {
  const repositories = useRepositories();
  const { sessao } = useSessao();
  const empresa = sessao?.empresaAtiva;
  const [eventos, setEventos] = useState<EventoAuditoria[]>([]);

  useEffect(() => {
    if (!empresa) return;
    void repositories.auditoria.listar(empresa.id).then(setEventos);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresa?.id]);

  if (!sessao || !empresa || !papelTemPermissao(empresa.papel, PERMISSOES.VER_AUDITORIA)) {
    return (
      <SurfaceCard className="p-5">
        <p className="text-sm text-(--text-secondary)">Seu papel atual nao tem acesso a auditoria.</p>
      </SurfaceCard>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <PageIntro eyebrow="Auditoria" title="Trilha de eventos" description="Registro imutavel das acoes relevantes realizadas nesta empresa." />

      <SurfaceCard className="p-5">
        {eventos.length === 0 ? (
          <p className="workspace-empty-state">Nenhum evento registrado ainda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-(--text-tertiary)">
                  <th className="border-b border-(--border) py-2 pr-4">Quando</th>
                  <th className="border-b border-(--border) py-2 pr-4">Acao</th>
                  <th className="border-b border-(--border) py-2 pr-4">Entidade</th>
                </tr>
              </thead>
              <tbody>
                {eventos.map((evento) => (
                  <tr key={evento.id}>
                    <td className="border-b border-(--border) py-3 pr-4 text-(--text-secondary)">
                      {new Date(evento.criadoEm).toLocaleString("pt-BR")}
                    </td>
                    <td className="border-b border-(--border) py-3 pr-4 font-medium text-(--text-primary)">{evento.acao}</td>
                    <td className="border-b border-(--border) py-3 pr-4 text-(--text-secondary)">
                      {evento.entidade}
                      {evento.entidadeId ? ` #${evento.entidadeId}` : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SurfaceCard>
    </div>
  );
}
