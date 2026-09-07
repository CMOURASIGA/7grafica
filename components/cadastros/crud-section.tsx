"use client";

import { useMemo, useState } from "react";
import { SectionLabel, SurfaceCard } from "@/components/ui/workspace-primitives";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";

export type CampoFormulario = {
  name: string;
  label: string;
  tipo: "texto" | "textarea" | "numero" | "checkbox" | "select";
  opcoes?: { value: string; label: string }[];
  obrigatorio?: boolean;
  placeholder?: string;
};

export type ColunaTabela<T> = {
  chave: string;
  titulo: string;
  render: (item: T) => React.ReactNode;
};

type CrudSectionProps<T extends { id: string; ativo?: boolean }> = {
  titulo: string;
  descricao?: string;
  nomeEntidade: string;
  campos: CampoFormulario[];
  itens: T[];
  colunas: ColunaTabela<T>[];
  valoresParaEdicao: (item: T) => Record<string, string | boolean>;
  aoCriar: (dados: Record<string, string | boolean>) => Promise<void>;
  aoAtualizar: (id: string, dados: Record<string, string | boolean>) => Promise<void>;
  aoRemover: (id: string) => Promise<void>;
  /** Botao/link extra por linha (ex.: "Abrir" para uma pagina de detalhe), renderizado antes de Editar/Remover. */
  acoesExtras?: (item: T) => React.ReactNode;
};

const CAMPOS_VAZIOS = (campos: CampoFormulario[]): Record<string, string | boolean> =>
  Object.fromEntries(campos.map((campo) => [campo.name, campo.tipo === "checkbox" ? true : ""]));

/**
 * Bloco generico de cadastro mestre: tabela + formulario de criacao/edicao +
 * remocao com confirmacao. Usado pelos cadastros "simples" (fornecedores,
 * formas de pagamento, unidades, categorias, equipamentos, workflows...)
 * para nao repetir a mesma UI de lista+form entidade por entidade.
 */
export function CrudSection<T extends { id: string; ativo?: boolean }>({
  titulo,
  descricao,
  nomeEntidade,
  campos,
  itens,
  colunas,
  valoresParaEdicao,
  aoCriar,
  aoAtualizar,
  aoRemover,
  acoesExtras,
}: CrudSectionProps<T>) {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [formAberto, setFormAberto] = useState(false);
  const [valores, setValores] = useState<Record<string, string | boolean>>(() => CAMPOS_VAZIOS(campos));
  const [enviando, setEnviando] = useState(false);

  const itemEmEdicao = useMemo(() => itens.find((item) => item.id === editandoId) ?? null, [itens, editandoId]);

  function abrirNovo() {
    setEditandoId(null);
    setValores(CAMPOS_VAZIOS(campos));
    setFormAberto(true);
  }

  function abrirEdicao(item: T) {
    setEditandoId(item.id);
    setValores(valoresParaEdicao(item));
    setFormAberto(true);
  }

  function fechar() {
    setFormAberto(false);
    setEditandoId(null);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setEnviando(true);
    try {
      if (editandoId) {
        await aoAtualizar(editandoId, valores);
        showToast(`${nomeEntidade} atualizado.`, "success");
      } else {
        await aoCriar(valores);
        showToast(`${nomeEntidade} cadastrado.`, "success");
      }
      fechar();
    } catch (erro) {
      showToast(erro instanceof Error ? erro.message : `Falha ao salvar ${nomeEntidade.toLowerCase()}.`, "error");
    } finally {
      setEnviando(false);
    }
  }

  async function handleRemover(item: T) {
    const ok = await confirm({
      title: `Remover ${nomeEntidade.toLowerCase()}?`,
      description: "Esta acao nao pode ser desfeita.",
      confirmLabel: "Remover",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await aoRemover(item.id);
      showToast(`${nomeEntidade} removido.`, "success");
    } catch (erro) {
      showToast(erro instanceof Error ? erro.message : `Falha ao remover ${nomeEntidade.toLowerCase()}.`, "error");
    }
  }

  return (
    <SurfaceCard className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <SectionLabel>{titulo}</SectionLabel>
          {descricao ? <p className="mt-1 text-xs text-(--text-secondary)">{descricao}</p> : null}
        </div>
        <button type="button" className="workspace-button-primary" onClick={abrirNovo}>
          + Novo {nomeEntidade.toLowerCase()}
        </button>
      </div>

      {formAberto ? (
        <form onSubmit={handleSubmit} className="mt-4 grid grid-cols-1 gap-3 rounded-xl border border-(--border) bg-(--bg-muted) p-4 sm:grid-cols-2">
          {campos.map((campo) => (
            <div key={campo.name} className={campo.tipo === "textarea" ? "sm:col-span-2" : undefined}>
              <label className="workspace-label" htmlFor={`${titulo}-${campo.name}`}>
                {campo.label}
              </label>
              {campo.tipo === "textarea" ? (
                <textarea
                  id={`${titulo}-${campo.name}`}
                  className="workspace-textarea"
                  required={campo.obrigatorio}
                  value={String(valores[campo.name] ?? "")}
                  onChange={(event) => setValores((prev) => ({ ...prev, [campo.name]: event.target.value }))}
                />
              ) : campo.tipo === "checkbox" ? (
                <label className="flex items-center gap-2 text-sm text-(--text-primary)">
                  <input
                    type="checkbox"
                    checked={Boolean(valores[campo.name])}
                    onChange={(event) => setValores((prev) => ({ ...prev, [campo.name]: event.target.checked }))}
                  />
                  {campo.placeholder ?? "Ativo"}
                </label>
              ) : campo.tipo === "select" ? (
                <select
                  id={`${titulo}-${campo.name}`}
                  className="workspace-select"
                  required={campo.obrigatorio}
                  value={String(valores[campo.name] ?? "")}
                  onChange={(event) => setValores((prev) => ({ ...prev, [campo.name]: event.target.value }))}
                >
                  <option value="">Selecione...</option>
                  {campo.opcoes?.map((opcao) => (
                    <option key={opcao.value} value={opcao.value}>
                      {opcao.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id={`${titulo}-${campo.name}`}
                  type={campo.tipo === "numero" ? "number" : "text"}
                  step={campo.tipo === "numero" ? "0.01" : undefined}
                  placeholder={campo.placeholder}
                  required={campo.obrigatorio}
                  className="workspace-input"
                  value={String(valores[campo.name] ?? "")}
                  onChange={(event) => setValores((prev) => ({ ...prev, [campo.name]: event.target.value }))}
                />
              )}
            </div>
          ))}
          <div className="flex gap-2 sm:col-span-2">
            <button type="submit" disabled={enviando} className="workspace-button-primary">
              {enviando ? "Salvando..." : itemEmEdicao ? "Salvar alteracoes" : "Cadastrar"}
            </button>
            <button type="button" onClick={fechar} className="workspace-button-secondary">
              Cancelar
            </button>
          </div>
        </form>
      ) : null}

      <div className="mt-4 overflow-x-auto">
        {itens.length === 0 ? (
          <p className="workspace-empty-state">Nenhum registro ainda.</p>
        ) : (
          <table className="w-full min-w-[480px] border-collapse text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-(--text-tertiary)">
                {colunas.map((coluna) => (
                  <th key={coluna.chave} className="border-b border-(--border) py-2 pr-4">
                    {coluna.titulo}
                  </th>
                ))}
                <th className="border-b border-(--border) py-2 pr-4" />
              </tr>
            </thead>
            <tbody>
              {itens.map((item) => (
                <tr key={item.id}>
                  {colunas.map((coluna) => (
                    <td key={coluna.chave} className="border-b border-(--border) py-3 pr-4 text-(--text-primary)">
                      {coluna.render(item)}
                    </td>
                  ))}
                  <td className="border-b border-(--border) py-3 pr-4 text-right">
                    <div className="flex justify-end gap-2">
                      {acoesExtras?.(item)}
                      <button type="button" className="workspace-button-secondary" onClick={() => abrirEdicao(item)}>
                        Editar
                      </button>
                      <button type="button" className="workspace-button-danger" onClick={() => void handleRemover(item)}>
                        Remover
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </SurfaceCard>
  );
}
