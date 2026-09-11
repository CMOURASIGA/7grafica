import { describe, expect, it } from "vitest";
import { avaliarCompatibilidade } from "./compatibilidade-equipamento";
import type { CapacidadeEquipamento, Equipamento, Trabalho } from "@/lib/domain/entities";

function equipamento(overrides: Partial<Equipamento> = {}): Equipamento {
  return {
    id: "equip-x",
    empresaId: "empresa-1",
    nome: "Equipamento X",
    tipo: "impressora",
    ativo: true,
    situacao: "disponivel",
    capacidadeSimultanea: 1,
    ...overrides,
  };
}

function capacidade(overrides: Partial<CapacidadeEquipamento> = {}): CapacidadeEquipamento {
  return {
    id: "cap-x",
    empresaId: "empresa-1",
    equipamentoId: "equip-x",
    formatos: "A4, A3",
    corPB: "ambos",
    duplex: false,
    materiaisCompativeisIds: [],
    observacoes: null,
    ...overrides,
  };
}

const trabalho: Pick<Trabalho, "formato" | "materialId" | "tipoEquipamentoNecessario"> = {
  formato: "A3",
  materialId: "material-1",
  tipoEquipamentoNecessario: "impressora",
};

describe("avaliarCompatibilidade (SPEC 06)", () => {
  it("compativel quando formato e material batem e o equipamento esta disponivel", () => {
    const resultado = avaliarCompatibilidade(trabalho, equipamento(), capacidade({ materiaisCompativeisIds: ["material-1"] }));
    expect(resultado.compativel).toBe(true);
    expect(resultado.motivos).toEqual([]);
  });

  it("incompativel por FORMATO quando o formato exigido nao esta na lista suportada", () => {
    const resultado = avaliarCompatibilidade(
      trabalho,
      equipamento(),
      capacidade({ formatos: "Ate 3.2m de largura", materiaisCompativeisIds: ["material-1"] }),
    );
    expect(resultado.compativel).toBe(false);
    expect(resultado.motivos.map((m) => m.tipo)).toContain("formato");
  });

  it("incompativel por MATERIAL quando a capacidade restringe materiais e o exigido nao esta na lista", () => {
    const resultado = avaliarCompatibilidade(trabalho, equipamento(), capacidade({ materiaisCompativeisIds: ["material-2"] }));
    expect(resultado.compativel).toBe(false);
    expect(resultado.motivos.map((m) => m.tipo)).toEqual(["material"]);
  });

  it("lista vazia de materiaisCompativeisIds significa SEM restricao", () => {
    const resultado = avaliarCompatibilidade(trabalho, equipamento(), capacidade({ materiaisCompativeisIds: [] }));
    expect(resultado.compativel).toBe(true);
  });

  it("incompativel quando o equipamento esta indisponivel ou em manutencao", () => {
    const indisponivel = avaliarCompatibilidade(trabalho, equipamento({ situacao: "indisponivel" }), capacidade({ materiaisCompativeisIds: [] }));
    expect(indisponivel.compativel).toBe(false);
    expect(indisponivel.motivos.map((m) => m.tipo)).toContain("situacao");

    const manutencao = avaliarCompatibilidade(trabalho, equipamento({ situacao: "manutencao" }), capacidade({ materiaisCompativeisIds: [] }));
    expect(manutencao.compativel).toBe(false);
  });

  it("incompativel quando o tipo do equipamento nao e o exigido pelo Trabalho", () => {
    const resultado = avaliarCompatibilidade(trabalho, equipamento({ tipo: "guilhotina" }), capacidade({ materiaisCompativeisIds: [] }));
    expect(resultado.compativel).toBe(false);
    expect(resultado.motivos.map((m) => m.tipo)).toContain("tipo_equipamento");
  });

  it("Trabalho sem formato/material exigido nao gera motivo dessas categorias", () => {
    const resultado = avaliarCompatibilidade(
      { formato: null, materialId: null, tipoEquipamentoNecessario: null },
      equipamento(),
      capacidade({ materiaisCompativeisIds: ["material-2"] }),
    );
    expect(resultado.compativel).toBe(true);
  });
});
