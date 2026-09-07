import type { MotivoRejeicaoOrcamento, StatusOrcamento } from "@/lib/domain/entities";

export const STATUS_ORCAMENTO_LABEL: Record<StatusOrcamento, string> = {
  rascunho: "Rascunho",
  enviado: "Enviado",
  aprovado: "Aprovado",
  alteracao_solicitada: "Alteracao solicitada",
  rejeitado: "Rejeitado",
  expirado: "Expirado",
  cancelado: "Cancelado",
};

export const STATUS_ORCAMENTO_TONE: Record<StatusOrcamento, "neutral" | "accent" | "success" | "warning" | "danger"> = {
  rascunho: "neutral",
  enviado: "accent",
  aprovado: "success",
  alteracao_solicitada: "warning",
  rejeitado: "danger",
  expirado: "danger",
  cancelado: "danger",
};

export const MOTIVO_REJEICAO_LABEL: Record<MotivoRejeicaoOrcamento, string> = {
  preco_alto: "Preco alto",
  prazo_incompativel: "Prazo incompativel",
  nao_precisa_mais: "Nao precisa mais",
  concorrencia: "Fechou com concorrencia",
  outro: "Outro",
};

export const MOTIVOS_REJEICAO: MotivoRejeicaoOrcamento[] = ["preco_alto", "prazo_incompativel", "nao_precisa_mais", "concorrencia", "outro"];
