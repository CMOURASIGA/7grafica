import { CONSULT_LOGO_URL } from "@/lib/brand";
import type { Empresa } from "@/lib/domain/entities";

export type IdentidadeCanto = {
  /** Logo mostrado no topo da sidebar (canto superior esquerdo). */
  logoUrl: string;
  /** Nome exibido junto ao logo quando ha whitelabel. */
  nomeCliente: string | null;
  /** true quando o logo/identidade e do cliente (whitelabel), nao da Consult Services. */
  whitelabel: boolean;
  corPrimaria: string | null;
  corDestaque: string | null;
};

/**
 * Resolve a identidade do canto superior esquerdo seguindo a regra do HUB:
 * 1) logo do cliente quando houver whitelabel configurado;
 * 2) fallback para a identidade Consult Services;
 * nunca um icone "C" isolado, nunca marca do 7Commander.
 */
export function resolverIdentidadeCanto(empresa: Empresa | null): IdentidadeCanto {
  if (empresa?.logoUrl) {
    return {
      logoUrl: empresa.logoUrl,
      nomeCliente: empresa.nome,
      whitelabel: true,
      corPrimaria: empresa.corPrimaria,
      corDestaque: empresa.corDestaque,
    };
  }

  return {
    logoUrl: CONSULT_LOGO_URL,
    nomeCliente: null,
    whitelabel: false,
    corPrimaria: empresa?.corPrimaria ?? null,
    corDestaque: empresa?.corDestaque ?? null,
  };
}
