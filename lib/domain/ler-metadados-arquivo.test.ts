// @vitest-environment node
import { describe, it, expect } from "vitest";
import { PDFDocument, degrees } from "pdf-lib";
import { lerMetadadosArquivo } from "./ler-metadados-arquivo";
import { rodarPreflight } from "./preflight";

describe("PDF real em memória", () => {
  it("lê páginas, tamanho A4, MIME e rotação sem persistir conteúdo", async () => {
    const pdf = await PDFDocument.create();
    pdf.addPage([595.28, 841.89]).setRotation(degrees(90));
    pdf.addPage([595.28, 841.89]).setRotation(degrees(90));
    const file = new File([Uint8Array.from(await pdf.save()).buffer], "arte.pdf", { type: "application/pdf" });
    const dados = await lerMetadadosArquivo(file);
    expect(dados.paginas).toBe(2);
    expect(dados.larguraMm).toBeCloseTo(297, 0);
    expect(rodarPreflight(dados, null)).toMatchObject({ formatoAproximado: "A4", orientacao: "paisagem", status: "ok" });
    expect(Object.keys(dados)).not.toContain("conteudo");
  });
  it("não inventa metadados para PDF inválido", async () => {
    await expect(lerMetadadosArquivo(new File(["não é PDF"], "erro.pdf"))).rejects.toThrow(/inválido/);
  });
  it("sinaliza PDF com dimensões diferentes", async () => {
    const pdf = await PDFDocument.create(); pdf.addPage([100, 200]); pdf.addPage([200, 200]);
    await expect(lerMetadadosArquivo(new File([Uint8Array.from(await pdf.save()).buffer], "misto.pdf"))).rejects.toThrow(/diferentes/);
  });
});
