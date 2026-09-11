import type {
  AvaliacaoCompatibilidadeEquipamento,
  CapacidadeEquipamento,
  Equipamento,
  MotivoCompatibilidadeEquipamento,
  Trabalho,
} from "@/lib/domain/entities";

/**
 * Regra deterministica de compatibilidade Equipamento x Trabalho (SPEC 06).
 * Nunca usa IA — so compara os campos ja cadastrados (capacidades tecnicas)
 * contra o que o Trabalho exige (formato/material), explicando cada motivo
 * de incompatibilidade para a UI (nunca so "nao compativel").
 */
export function avaliarCompatibilidade(
  trabalho: Pick<Trabalho, "formato" | "materialId" | "tipoEquipamentoNecessario">,
  equipamento: Equipamento,
  capacidade: CapacidadeEquipamento | null,
): AvaliacaoCompatibilidadeEquipamento {
  const motivos: MotivoCompatibilidadeEquipamento[] = [];

  if (trabalho.tipoEquipamentoNecessario && equipamento.tipo !== trabalho.tipoEquipamentoNecessario) {
    motivos.push({
      tipo: "tipo_equipamento",
      mensagem: `Trabalho exige um equipamento do tipo "${trabalho.tipoEquipamentoNecessario}", este é "${equipamento.tipo}".`,
    });
  }

  if (equipamento.situacao !== "disponivel" && equipamento.situacao !== "em_uso") {
    motivos.push({ tipo: "situacao", mensagem: `Equipamento está "${equipamento.situacao}" — não pode receber nova alocação.` });
  }

  if (!capacidade) {
    motivos.push({ tipo: "formato", mensagem: "Equipamento não possui capacidade técnica cadastrada." });
  } else {
    if (trabalho.formato) {
      const formatosSuportados = capacidade.formatos
        .split(",")
        .map((formato) => formato.trim().toLowerCase())
        .filter(Boolean);
      const formatoExigido = trabalho.formato.trim().toLowerCase();
      const compativelPorFormato = formatosSuportados.some((formato) => formato === formatoExigido || formato.includes(formatoExigido));
      if (!compativelPorFormato) {
        motivos.push({ tipo: "formato", mensagem: `Formato "${trabalho.formato}" não está entre os suportados ("${capacidade.formatos}").` });
      }
    }

    if (trabalho.materialId && capacidade.materiaisCompativeisIds.length > 0 && !capacidade.materiaisCompativeisIds.includes(trabalho.materialId)) {
      motivos.push({ tipo: "material", mensagem: "Material exigido pelo Trabalho não está entre os materiais compatíveis deste equipamento." });
    }
  }

  return { equipamentoId: equipamento.id, compativel: motivos.length === 0, motivos };
}
