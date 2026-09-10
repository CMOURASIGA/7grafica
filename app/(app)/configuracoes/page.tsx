"use client";

import { useEffect, useState } from "react";
import { PageIntro, SectionLabel, SurfaceCard } from "@/components/ui/workspace-primitives";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { useRepositoriosAutorizados as useRepositories, useSessao } from "@/components/providers/session-provider";
import { papelTemPermissao, PERMISSOES } from "@/lib/rbac";
import { restaurarDadosDemo } from "@/lib/mock/reset";
import type { VinculoComPerfil } from "@/lib/repositories/types";
import { EmpresaForm } from "./empresa-form";
import { UsuariosTable } from "./usuarios-table";
import { SegurancaAdmin } from "./seguranca-admin";
import { ParametrosAdmin } from "./parametros-admin";

export default function ConfiguracoesPage() {
  const repositories = useRepositories();
  const { sessao } = useSessao();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [vinculos, setVinculos] = useState<VinculoComPerfil[]>([]);

  const empresa = sessao?.empresaAtiva;

  async function carregarUsuarios() {
    if (!empresa) return;
    setVinculos(await repositories.usuarios.listarPorEmpresa(empresa.id));
  }

  useEffect(() => {
    void carregarUsuarios();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresa?.id]);

  if (!sessao || !empresa) {
    return (
      <SurfaceCard className="p-5">
        <p className="text-sm text-(--text-secondary)">Voce nao esta vinculado a nenhuma empresa.</p>
      </SurfaceCard>
    );
  }

  const podeGerenciarEmpresa =
    papelTemPermissao(empresa.papel, PERMISSOES.GERENCIAR_EMPRESA) || papelTemPermissao(empresa.papel, PERMISSOES.GERENCIAR_WHITELABEL);
  const podeGerenciarUsuarios = papelTemPermissao(empresa.papel, PERMISSOES.GERENCIAR_USUARIOS);

  async function handleRestaurarDemo() {
    const ok = await confirm({
      title: "Restaurar dados de demonstracao?",
      description:
        "Todos os cadastros, usuarios e configuracoes locais serao substituidos pelo conjunto de demonstracao original. Esta acao nao pode ser desfeita.",
      confirmLabel: "Restaurar",
      tone: "danger",
    });
    if (!ok) return;
    restaurarDadosDemo();
    showToast("Dados de demonstracao restaurados. Faca login novamente.", "success");
    window.location.href = "/login";
  }

  return (
    <div className="flex flex-col gap-4">
      <PageIntro
        eyebrow="Configuracoes"
        title="Empresa, usuarios e whitelabel"
        description="Ajustes de identidade visual e controle de acesso da sua empresa no 7Grafica."
      />

      {podeGerenciarEmpresa ? (
        <SurfaceCard className="p-5">
          <SectionLabel>Identidade e whitelabel</SectionLabel>
          <div className="mt-4">
            <EmpresaForm empresa={empresa} />
          </div>
        </SurfaceCard>
      ) : null}

      {podeGerenciarUsuarios ? (
        <SurfaceCard className="p-5">
          <SectionLabel>Usuarios da empresa</SectionLabel>
          <div className="mt-4">
            <UsuariosTable vinculos={vinculos} onAtualizado={carregarUsuarios} />
          </div>
        </SurfaceCard>
      ) : null}

      {papelTemPermissao(empresa.papel, PERMISSOES.ADMINISTRACAO_SEGURANCA) ? (
        <SurfaceCard className="p-5">
          <SectionLabel>Segurança, perfis e permissões</SectionLabel>
          <div className="mt-4"><SegurancaAdmin /></div>
        </SurfaceCard>
      ) : null}

      {papelTemPermissao(empresa.papel, PERMISSOES.GERENCIAR_FEATURE_FLAGS) ? (
        <SurfaceCard className="p-5"><SectionLabel>Parâmetros funcionais</SectionLabel><div className="mt-4"><ParametrosAdmin /></div></SurfaceCard>
      ) : null}

      {!podeGerenciarEmpresa && !podeGerenciarUsuarios ? (
        <SurfaceCard className="p-5">
          <p className="text-sm text-(--text-secondary)">Seu papel atual nao tem acesso a nenhuma configuracao.</p>
        </SurfaceCard>
      ) : null}

      {papelTemPermissao(empresa.papel, PERMISSOES.GERENCIAR_FEATURE_FLAGS) ? (
        <SurfaceCard className="p-5">
          <SectionLabel>Dados de demonstracao</SectionLabel>
          <p className="mt-3 text-sm leading-6 text-(--text-secondary)">
            Enquanto o 7Grafica roda sem Supabase, todos os dados vivem no LocalStorage deste navegador. Use esta
            opcao para descartar qualquer alteracao e voltar ao conjunto de demonstracao original (mesma empresa,
            usuarios, clientes e cadastros).
          </p>
          <button type="button" onClick={() => void handleRestaurarDemo()} className="mt-4 workspace-button-danger">
            Restaurar dados de demonstracao
          </button>
        </SurfaceCard>
      ) : null}
    </div>
  );
}
