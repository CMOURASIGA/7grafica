import type { Papel } from "./entities";

export type Exigencia2FA = "opcional" | "obrigatorio";
export type Politica2FAPapel = { papel: Papel; exigencia: Exigencia2FA; atualizadoEm: string | null; atualizadoPorUsuarioId: string | null };
export type ConfiguracaoAdministrativa = { empresaId: string; politicas2FA: Politica2FAPapel[] };

export const politicas2FAPadrao = (): Politica2FAPapel[] => (["admin", "gerente", "atendente", "operador"] as Papel[]).map((papel) => ({ papel, exigencia: "opcional", atualizadoEm: null, atualizadoPorUsuarioId: null }));
