import { CONSULT_LOGO_URL } from "@/lib/brand";
import type { Empresa } from "@/lib/domain/entities";

export const CORES_PADRAO = {
  primaria: "#003b73",
  destaque: "#00aeef",
} as const;

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

/** Aplica a paleta da empresa sem criar uma segunda fonte de dados de whitelabel. */
export function aplicarIdentidadeVisual(identidade: IdentidadeCanto): void {
  if (typeof document === "undefined") return;
  const primaria = corHexValida(identidade.corPrimaria) ?? CORES_PADRAO.primaria;
  const destaque = corHexValida(identidade.corDestaque) ?? CORES_PADRAO.destaque;
  const root = document.documentElement.style;
  root.setProperty("--accent", primaria);
  root.setProperty("--accent-strong", primaria);
  root.setProperty("--brand-ink", primaria);
  root.setProperty("--sidebar", primaria);
  root.setProperty("--sidebar-deep", primaria);
  root.setProperty("--brand-highlight", destaque);
}

export function corHexValida(cor: string | null): string | null {
  const normalizada = cor?.trim().toLowerCase() ?? "";
  return /^#[0-9a-f]{6}$/.test(normalizada) ? normalizada : null;
}
