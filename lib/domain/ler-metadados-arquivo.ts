import type { DadosMetadadosArquivo } from "@/lib/repositories/types";

/** Leitura temporária. Nenhum binário ou URL de objeto é persistido. */
export async function lerMetadadosArquivo(file: File): Promise<DadosMetadadosArquivo> {
  if (file.size > 25 * 1024 * 1024) throw new Error("Leitura automática limitada a 25 MB. Registre os metadados manualmente.");
  const extensao = file.name.split(".").pop()?.toLowerCase() ?? "";
  const dados: DadosMetadadosArquivo = { nome: file.name, extensao, mimeType: file.type || "application/octet-stream", tamanhoBytes: file.size, paginas: null, larguraMm: null, alturaMm: null };
  if (extensao !== "pdf") return dados;
  const { PDFDocument } = await import("pdf-lib");
  let pdf;
  try {
    pdf = await PDFDocument.load(await file.arrayBuffer(), { updateMetadata: false });
  } catch {
    throw new Error("PDF protegido ou inválido. Não foi possível identificar páginas e dimensões.");
  }
  const paginas = pdf.getPages();
  if (!paginas.length) throw new Error("PDF sem páginas.");
  const medidas = paginas.map((page) => {
    const { width, height } = page.getCropBox();
    return Math.abs(page.getRotation().angle % 180) === 90 ? [height, width] : [width, height];
  });
  if (medidas.some(([w, h]) => Math.abs(w - medidas[0][0]) > 1 || Math.abs(h - medidas[0][1]) > 1)) throw new Error("PDF com páginas de dimensões diferentes. Confira cada página e registre os metadados manualmente.");
  return { ...dados, mimeType: "application/pdf", paginas: paginas.length, larguraMm: Math.round(medidas[0][0] * 25.4 / 72 * 100) / 100, alturaMm: Math.round(medidas[0][1] * 25.4 / 72 * 100) / 100 };
}
