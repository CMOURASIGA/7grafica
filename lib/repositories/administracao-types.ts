import type { ConfiguracaoAdministrativa, Exigencia2FA } from "@/lib/domain/administracao";
import type { Papel } from "@/lib/domain/entities";

export type AdministracaoRepository = {
  obter(empresaId: string): Promise<ConfiguracaoAdministrativa>;
  definirPolitica2FA(empresaId: string, dados: { papel: Papel; exigencia: Exigencia2FA }, usuarioId: string): Promise<ConfiguracaoAdministrativa>;
};
