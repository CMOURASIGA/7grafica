import type { Arquivo, Cliente, Contato, EmailContato, Orcamento, Pedido, Recebimento, Trabalho } from "@/lib/domain/entities";
import { estadoPortalVazio, type EstadoPortalCliente, type PainelPortalCliente, type PedidoPortal, type SessaoPortalCliente } from "@/lib/domain/portal-cliente";
import type { PortalClienteGestaoRepository, PortalClientePublicoRepository } from "@/lib/repositories/portal-cliente-types";
import { gerarId, gravarValorConfirmado, lerColecao, lerValor, removerChave } from "@/lib/storage/local-storage-client";
import { lerEntregas } from "./entregas";

const CHAVE_SESSAO = "portal_cliente_sessao";
const chave = (empresaId: string) => `portal_cliente_v1:${empresaId}`;
export const lerPortalCliente = (empresaId: string): EstadoPortalCliente => { const atual = lerValor<EstadoPortalCliente>(chave(empresaId)); return atual ? { ...atual, eventos: atual.eventos ?? [] } : estadoPortalVazio(); };
const salvar = (empresaId: string, estado: EstadoPortalCliente) => gravarValorConfirmado(chave(empresaId), estado);
const agora = () => new Date().toISOString();
const futuro = (dias: number) => new Date(Date.now() + dias * 86400000).toISOString();
const tokenSeguro = () => { const bytes = new Uint8Array(24); crypto.getRandomValues(bytes); return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(""); };
async function hash(texto: string) { const bytes = new TextEncoder().encode(texto); const digest = await crypto.subtle.digest("SHA-256", bytes); return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join(""); }
function emailValido(email: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }
function validarDias(dias: number) { if (!Number.isInteger(dias) || dias < 1 || dias > 90) throw new Error("Validade deve estar entre 1 e 90 dias."); }
function validarOperacao(estado: EstadoPortalCliente, operacaoId: string) { if (!operacaoId.trim()) throw new Error("Identificador da operação obrigatório."); return estado.operacoes.includes(operacaoId); }
function auditar(estado: EstadoPortalCliente, empresaId: string, usuarioId: string, acao: string, entidadeId: string, dadosDepois: Record<string, unknown>) { estado.eventos.push({ id: gerarId("evt"), empresaId, usuarioId, acao, entidade: "portal_cliente", entidadeId, dadosAntes: null, dadosDepois, criadoEm: agora() }); }

function montarPedido(pedido: Pedido): PedidoPortal {
  const recebimentos = lerColecao<Recebimento>("recebimentos").filter((r) => r.pedidoId === pedido.id && r.empresaId === pedido.empresaId);
  const trabalhos = lerColecao<Trabalho>("trabalhos").filter((t) => t.pedidoId === pedido.id && t.empresaId === pedido.empresaId);
  const idsLiberados = new Set(trabalhos.map((t) => t.arquivoLiberadoId).filter(Boolean));
  const arquivosLiberados = lerColecao<Arquivo>("arquivos").filter((a) => a.pedidoId === pedido.id && idsLiberados.has(a.id));
  const orcamento = pedido.orcamentoId ? lerColecao<Orcamento>("orcamentos").find((o) => o.id === pedido.orcamentoId && o.empresaId === pedido.empresaId) ?? null : null;
  const recebido = Math.round(recebimentos.reduce((s, r) => s + r.valor, 0) * 100) / 100;
  const entrega = lerEntregas(pedido.empresaId).entregas.find((e) => e.pedidoId === pedido.id) ?? null;
  return { pedido, recebimentos, trabalhos, arquivosLiberados, orcamento, entrega, recebido, saldo: Math.max(0, Math.round((pedido.valorTotal - recebido) * 100) / 100) };
}
function painelDaSessao(sessao: SessaoPortalCliente): PainelPortalCliente {
  const pedidos = lerColecao<Pedido>("pedidos").filter((p) => p.empresaId === sessao.empresaId && p.clienteId === sessao.clienteId).map(montarPedido);
  const estado = lerPortalCliente(sessao.empresaId), conta = estado.contas.find((c) => c.id === sessao.contaId)!;
  const orcamentos = lerColecao<Orcamento>("orcamentos").filter((o) => o.empresaId === sessao.empresaId && o.clienteId === sessao.clienteId && o.status !== "rascunho");
  return { empresaId: sessao.empresaId, clienteId: sessao.clienteId, email: conta.email, pedidosAtivos: pedidos.filter((p) => p.pedido.statusEntrega === "aguardando_producao"), historico: pedidos.filter((p) => p.pedido.statusEntrega !== "aguardando_producao"), orcamentos };
}

export function criarPortalClientePublicoRepositoryLocal(): PortalClientePublicoRepository {
  return {
    async ativarConta(tokenConvite, senha) {
      if (senha.length < 8) throw new Error("A senha deve ter pelo menos 8 caracteres.");
      for (const cliente of lerColecao<Cliente>("clientes")) {
        const estado = lerPortalCliente(cliente.empresaId), convite = estado.convites.find((c) => c.token === tokenConvite);
        if (!convite) continue;
        if (convite.revogadoEm || convite.usadoEm || convite.expiraEm <= agora()) throw new Error("Convite inválido, expirado ou já utilizado.");
        let conta = estado.contas.find((c) => c.clienteId === convite.clienteId && c.email === convite.email);
        const senhaHash = await hash(senha);
        if (conta) Object.assign(conta, { senhaHash, ativo: true });
        else { conta = { id: gerarId("conta-portal"), empresaId: convite.empresaId, clienteId: convite.clienteId, email: convite.email, senhaHash, ativo: true, criadoEm: agora(), ultimoAcessoEm: null }; estado.contas.push(conta); }
        convite.usadoEm = agora(); const sessao = { id: tokenSeguro(), contaId: conta.id, empresaId: conta.empresaId, clienteId: conta.clienteId, criadoEm: agora(), expiraEm: futuro(7) }; estado.sessoes.push(sessao); auditar(estado, conta.empresaId, "cliente-portal", "conta_portal_ativada", conta.id, { clienteId: conta.clienteId, email: conta.email }); salvar(conta.empresaId, estado); gravarValorConfirmado(CHAVE_SESSAO, sessao); return sessao;
      }
      throw new Error("Convite inválido, expirado ou já utilizado.");
    },
    async entrar(email, senha) {
      const normalizado = email.trim().toLowerCase();
      for (const cliente of lerColecao<Cliente>("clientes")) {
        const estado = lerPortalCliente(cliente.empresaId), conta = estado.contas.find((c) => c.email === normalizado && c.ativo);
        if (!conta || conta.senhaHash !== await hash(senha)) continue;
        conta.ultimoAcessoEm = agora(); const sessao = { id: tokenSeguro(), contaId: conta.id, empresaId: conta.empresaId, clienteId: conta.clienteId, criadoEm: agora(), expiraEm: futuro(7) }; estado.sessoes.push(sessao); salvar(conta.empresaId, estado); gravarValorConfirmado(CHAVE_SESSAO, sessao); return sessao;
      }
      throw new Error("E-mail ou senha inválidos.");
    },
    async sair() { removerChave(CHAVE_SESSAO); },
    async obterSessao() { const sessao = lerValor<SessaoPortalCliente>(CHAVE_SESSAO); if (!sessao || sessao.expiraEm <= agora()) { removerChave(CHAVE_SESSAO); return null; } const estado = lerPortalCliente(sessao.empresaId); return estado.sessoes.some((s) => s.id === sessao.id) ? sessao : null; },
    async obterPainel() { const sessao = await this.obterSessao(); return sessao ? painelDaSessao(sessao) : null; },
    async buscarPedidoPorToken(token) {
      for (const pedido of lerColecao<Pedido>("pedidos")) {
        const estado = lerPortalCliente(pedido.empresaId), acesso = estado.tokensPedido.find((t) => t.token === token && t.pedidoId === pedido.id);
        if (!acesso) continue;
        if (acesso.revogadoEm || acesso.expiraEm <= agora()) return null;
        acesso.ultimoAcessoEm = agora(); salvar(pedido.empresaId, estado); return montarPedido(pedido);
      }
      return null;
    },
  };
}

export function criarPortalClienteGestaoRepositoryLocal(): PortalClienteGestaoRepository {
  return {
    async listarConvites(empresaId) { return lerPortalCliente(empresaId).convites; },
    async listarTokensPedido(empresaId) { return lerPortalCliente(empresaId).tokensPedido; },
    async convidar(empresaId, dados, usuarioId) {
      const estado = lerPortalCliente(empresaId); if (validarOperacao(estado, dados.operacaoId)) return estado.convites.find((c) => c.operacaoId === dados.operacaoId)!;
      validarDias(dados.validadeDias); const cliente = lerColecao<Cliente>("clientes").find((c) => c.id === dados.clienteId && c.empresaId === empresaId && c.ativo); if (!cliente) throw new Error("Cliente ativo não encontrado.");
      const email = dados.email.trim().toLowerCase(); if (!emailValido(email)) throw new Error("E-mail inválido.");
      const idsContato = new Set(lerColecao<Contato>("contatos").filter((c) => c.empresaId === empresaId && c.clienteId === cliente.id && c.ativo).map((c) => c.id));
      const emails = lerColecao<EmailContato>("emails_contato"); if (!emails.some((e) => e.empresaId === empresaId && idsContato.has(e.contatoId) && e.email.toLowerCase() === email)) throw new Error("Use um e-mail cadastrado nos contatos deste cliente.");
      estado.convites.filter((c) => c.clienteId === cliente.id && !c.usadoEm && !c.revogadoEm).forEach((c) => c.revogadoEm = agora());
      const convite = { id: gerarId("convite-portal"), empresaId, clienteId: cliente.id, email, token: tokenSeguro(), expiraEm: futuro(dados.validadeDias), usadoEm: null, revogadoEm: null, criadoPorUsuarioId: usuarioId, criadoEm: agora(), operacaoId: dados.operacaoId }; estado.convites.push(convite); estado.operacoes.push(dados.operacaoId); auditar(estado, empresaId, usuarioId, "convite_portal_criado", convite.id, { clienteId: cliente.id, email, expiraEm: convite.expiraEm }); salvar(empresaId, estado); return convite;
    },
    async emitirTokenPedido(empresaId, dados, usuarioId) {
      const estado = lerPortalCliente(empresaId); if (validarOperacao(estado, dados.operacaoId)) return estado.tokensPedido.find((t) => t.operacaoId === dados.operacaoId)!;
      validarDias(dados.validadeDias); const pedido = lerColecao<Pedido>("pedidos").find((p) => p.id === dados.pedidoId && p.empresaId === empresaId); if (!pedido) throw new Error("Pedido não encontrado.");
      const tokenPedido = { id: gerarId("token-pedido"), empresaId, pedidoId: pedido.id, token: tokenSeguro(), expiraEm: futuro(dados.validadeDias), revogadoEm: null, criadoPorUsuarioId: usuarioId, criadoEm: agora(), ultimoAcessoEm: null, operacaoId: dados.operacaoId }; estado.tokensPedido.push(tokenPedido); estado.operacoes.push(dados.operacaoId); auditar(estado, empresaId, usuarioId, "token_pedido_criado", tokenPedido.id, { pedidoId: pedido.id, expiraEm: tokenPedido.expiraEm }); salvar(empresaId, estado); return tokenPedido;
    },
    async revogarConvite(empresaId, conviteId, usuarioId) { const estado = lerPortalCliente(empresaId), item = estado.convites.find((c) => c.id === conviteId); if (!item) throw new Error("Convite não encontrado."); item.revogadoEm = agora(); auditar(estado, empresaId, usuarioId, "convite_portal_revogado", item.id, { clienteId: item.clienteId }); salvar(empresaId, estado); },
    async revogarTokenPedido(empresaId, tokenId, usuarioId) { const estado = lerPortalCliente(empresaId), item = estado.tokensPedido.find((t) => t.id === tokenId); if (!item) throw new Error("Token não encontrado."); item.revogadoEm = agora(); auditar(estado, empresaId, usuarioId, "token_pedido_revogado", item.id, { pedidoId: item.pedidoId }); salvar(empresaId, estado); },
  };
}
