import { beforeEach, describe, expect, it } from "vitest";
import { criarRepositoriesLocal } from "./index";
import { restaurarDadosDemo } from "@/lib/mock/reset";
import { SENHA_DEMO, usuariosPerfilSeed } from "@/lib/mock/seed-data";
import { limparNamespace } from "@/lib/storage/local-storage-client";

describe("SessaoRepository (LocalStorage)", () => {
  beforeEach(() => {
    limparNamespace();
    restaurarDadosDemo();
  });

  it("nao ha sessao antes do login", async () => {
    const repositories = criarRepositoriesLocal();
    expect(await repositories.sessao.obterAtual()).toBeNull();
  });

  it("autentica um usuario seedado e resolve empresa + papel", async () => {
    const repositories = criarRepositoriesLocal();
    const admin = usuariosPerfilSeed.find((u) => u.id === "usuario-admin")!;

    const sessao = await repositories.sessao.entrar(admin.email, SENHA_DEMO);

    expect(sessao.usuario.id).toBe("usuario-admin");
    expect(sessao.empresaAtiva?.papel).toBe("admin");
    expect(sessao.empresaAtiva?.nome).toBe("Grafica Nova Era");

    const atual = await repositories.sessao.obterAtual();
    expect(atual?.usuario.id).toBe("usuario-admin");
  });

  it("rejeita senha incorreta", async () => {
    const repositories = criarRepositoriesLocal();
    const admin = usuariosPerfilSeed[0];
    await expect(repositories.sessao.entrar(admin.email, "senha-errada")).rejects.toThrow();
  });

  it("sair remove a sessao atual", async () => {
    const repositories = criarRepositoriesLocal();
    const admin = usuariosPerfilSeed[0];
    await repositories.sessao.entrar(admin.email, SENHA_DEMO);
    await repositories.sessao.sair();
    expect(await repositories.sessao.obterAtual()).toBeNull();
  });
});
