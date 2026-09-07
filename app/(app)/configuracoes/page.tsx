import { PageIntro, SectionLabel, SurfaceCard } from "@/components/ui/workspace-primitives";
import { getSessaoAtual } from "@/lib/auth/session";
import { hasSupabaseConfig } from "@/lib/env";
import { papelTemPermissao, PERMISSOES } from "@/lib/rbac";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { EmpresaForm } from "./empresa-form";
import { UsuariosTable, type LinhaUsuario } from "./usuarios-table";

export default async function ConfiguracoesPage() {
  if (!hasSupabaseConfig()) {
    return (
      <SurfaceCard className="p-5">
        <p className="text-sm text-(--text-secondary)">Supabase nao configurado neste ambiente.</p>
      </SurfaceCard>
    );
  }

  const sessao = await getSessaoAtual();
  const empresa = sessao?.empresaAtiva;

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

  let linhasUsuarios: LinhaUsuario[] = [];
  if (podeGerenciarUsuarios) {
    const supabase = await getSupabaseServerClient();
    const { data } = await supabase!
      .from("empresa_usuarios")
      .select("id, papel, ativo, usuario_id, perfil:usuarios_perfil(nome, email)")
      .eq("empresa_id", empresa.id)
      .order("criado_em", { ascending: true });

    linhasUsuarios = (data ?? []).map((linha) => {
      const perfil = linha.perfil as unknown as { nome: string; email: string | null } | null;
      return {
        vinculoId: linha.id as string,
        nome: perfil?.nome ?? "",
        email: perfil?.email ?? null,
        papel: linha.papel,
        ativo: linha.ativo,
        souEu: linha.usuario_id === sessao.usuario.id,
      };
    });
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
            <UsuariosTable linhas={linhasUsuarios} />
          </div>
        </SurfaceCard>
      ) : null}

      {!podeGerenciarEmpresa && !podeGerenciarUsuarios ? (
        <SurfaceCard className="p-5">
          <p className="text-sm text-(--text-secondary)">Seu papel atual nao tem acesso a nenhuma configuracao.</p>
        </SurfaceCard>
      ) : null}
    </div>
  );
}
