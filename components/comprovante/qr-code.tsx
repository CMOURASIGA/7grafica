"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

/**
 * QR Code de acompanhamento do comprovante. Gerado client-side (sem
 * servico externo) a partir da URL completa do link publico — sujeito a
 * mesma limitacao de MVP do LocalStorage (ver docs/MVP-LOCALSTORAGE.md):
 * so resolve no navegador que criou o pedido/orcamento.
 */
export function QrCode({ valor, tamanho = 160 }: { valor: string; tamanho?: number }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    QRCode.toDataURL(valor, { width: tamanho, margin: 1 })
      .then((url) => {
        if (!cancelado) setDataUrl(url);
      })
      .catch(() => setDataUrl(null));
    return () => {
      cancelado = true;
    };
  }, [valor, tamanho]);

  if (!dataUrl) {
    return <div className="flex items-center justify-center rounded-lg border border-(--border) bg-(--bg-muted)" style={{ width: tamanho, height: tamanho }} />;
  }

  // eslint-disable-next-line @next/next/no-img-element -- data: URI gerado localmente, next/image nao se aplica.
  return <img src={dataUrl} alt="QR Code de acompanhamento" width={tamanho} height={tamanho} className="rounded-lg border border-(--border)" />;
}
