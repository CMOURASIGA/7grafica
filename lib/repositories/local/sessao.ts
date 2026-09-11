import { gravarValor, lerColecao, lerValor, removerChave } from "@/lib/storage/local-storage-client";
import type { Empresa, EmpresaUsuario, UsuarioPerfil } from "@/lib/domain/entities";
import type { SessaoAtual, SessaoRepository } from "@/lib/repositories/types";
import { CHAVES_USUARIOS } from "@/lib/repositories/local/usuarios";

const CHAVE_EMPRESAS = "empresas";
const CHAVE_SESSAO = "sessao_atual";
/**
 * Credenciais de demonstracao (email -> senha em texto puro). Existe apenas
 * no adapter local: quando o adapter Supabase entrar, login passa a ser
 * client.auth.signInWithPassword e esta tabela deixa de existir. Nunca usar
 * este padrao para dados reais de usuario.
 */
const CHAVE_CREDENCIAIS = "credenciais_demo";

type Credencial = { usuarioId: string; email: string; senha: string };

function montarSessao(usuarioId: string): SessaoAtual | null {
  const perfil = lerColecao<UsuarioPerfil>(CHAVES_USUARIOS.perfis).find((p) => p.id === usuarioId);
  if (!perfil) return null;

  const vinculos = lerColecao<EmpresaUsuario>(CHAVES_USUARIOS.vinculos).filter(
    (v) => v.usuarioId === usuarioId && v.ativo,
  );
  const empresas = lerColecao<Empresa>(CHAVE_EMPRESAS);
  const primeiroVinculo = vinculos[0];
  const empresa = primeiroVinculo ? empresas.find((e) => e.id === primeiroVinculo.empresaId) : undefined;

  return {
    usuario: perfil,
    vinculos,
    empresaAtiva: empresa && primeiroVinculo ? { ...empresa, papel: primeiroVinculo.papel } : null,
  };
}

export function criarSessaoRepositoryLocal(): SessaoRepository {
  return {
    async obterAtual() {
      const usuarioId = lerValor<string>(CHAVE_SESSAO);
      if (!usuarioId) return null;
      return montarSessao(usuarioId);
    },
    async entrar(email, senha) {
      const credencial = lerColecao<Credencial>(CHAVE_CREDENCIAIS).find(
        (c) => c.email.toLowerCase() === email.trim().toLowerCase(),
      );
      if (!credencial || credencial.senha !== senha) {
        throw new Error("E-mail ou senha invalidos.");
      }
      const sessao = montarSessao(credencial.usuarioId);
      if (!sessao) throw new Error("Usuario sem perfil valido.");
      gravarValor(CHAVE_SESSAO, credencial.usuarioId);
      return sessao;
    },
    async sair() {
      removerChave(CHAVE_SESSAO);
    },
  };
}

export const CHAVES_SESSAO = { sessao: CHAVE_SESSAO, credenciais: CHAVE_CREDENCIAIS, empresas: CHAVE_EMPRESAS };
