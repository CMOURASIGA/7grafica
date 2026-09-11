import type { ConvitePortalCliente, PainelPortalCliente, PedidoPortal, SessaoPortalCliente, TokenPedidoPortal } from "@/lib/domain/portal-cliente";

export type PortalClientePublicoRepository = {
  ativarConta(tokenConvite: string, senha: string): Promise<SessaoPortalCliente>;
  entrar(email: string, senha: string): Promise<SessaoPortalCliente>;
  sair(): Promise<void>;
  obterSessao(): Promise<SessaoPortalCliente | null>;
  obterPainel(): Promise<PainelPortalCliente | null>;
  buscarPedidoPorToken(token: string): Promise<PedidoPortal | null>;
};

export type PortalClienteGestaoRepository = {
  listarConvites(empresaId: string): Promise<ConvitePortalCliente[]>;
  listarTokensPedido(empresaId: string): Promise<TokenPedidoPortal[]>;
  convidar(empresaId: string, dados: { clienteId: string; email: string; validadeDias: number; operacaoId: string }, usuarioId: string): Promise<ConvitePortalCliente>;
  emitirTokenPedido(empresaId: string, dados: { pedidoId: string; validadeDias: number; operacaoId: string }, usuarioId: string): Promise<TokenPedidoPortal>;
  revogarConvite(empresaId: string, conviteId: string, usuarioId: string): Promise<void>;
  revogarTokenPedido(empresaId: string, tokenId: string, usuarioId: string): Promise<void>;
};
