import { gravarColecao, lerColecao } from "@/lib/storage/local-storage-client";
import type { EmpresaUsuario, Papel, UsuarioPerfil } from "@/lib/domain/entities";
import type { UsuarioRepository } from "@/lib/repositories/types";

const CHAVE_PERFIS = "usuarios_perfil";
const CHAVE_VINCULOS = "empresa_usuarios";

export function criarUsuarioRepositoryLocal(): UsuarioRepository {
  return {
    async obterPerfil(id) {
      return lerColecao<UsuarioPerfil>(CHAVE_PERFIS).find((perfil) => perfil.id === id) ?? null;
    },
    async listarPorEmpresa(empresaId) {
      const perfis = lerColecao<UsuarioPerfil>(CHAVE_PERFIS);
      return lerColecao<EmpresaUsuario>(CHAVE_VINCULOS)
        .filter((vinculo) => vinculo.empresaId === empresaId)
        .map((vinculo) => ({ ...vinculo, perfil: perfis.find((p) => p.id === vinculo.usuarioId) ?? null }));
    },
    async alterarPapel(vinculoId: string, papel: Papel) {
      const vinculos = lerColecao<EmpresaUsuario>(CHAVE_VINCULOS);
      const indice = vinculos.findIndex((v) => v.id === vinculoId);
      if (indice === -1) throw new Error(`Vinculo ${vinculoId} nao encontrado.`);
      vinculos[indice] = { ...vinculos[indice], papel };
      gravarColecao(CHAVE_VINCULOS, vinculos);
    },
    async definirAtivo(vinculoId: string, ativo: boolean) {
      const vinculos = lerColecao<EmpresaUsuario>(CHAVE_VINCULOS);
      const indice = vinculos.findIndex((v) => v.id === vinculoId);
      if (indice === -1) throw new Error(`Vinculo ${vinculoId} nao encontrado.`);
      vinculos[indice] = { ...vinculos[indice], ativo };
      gravarColecao(CHAVE_VINCULOS, vinculos);
    },
  };
}

export const CHAVES_USUARIOS = { perfis: CHAVE_PERFIS, vinculos: CHAVE_VINCULOS };
