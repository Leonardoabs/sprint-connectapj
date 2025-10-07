// src/pages/api/noticias.ts
import type { NextApiRequest, NextApiResponse } from "next";

type Noticia = {
  id: string;
  titulo: string;
  descricao: string;
  link: string;
  data: string;
  fonte: string;
  imagem: string | null;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Noticia[] | { error: string }>
) {
  const apiKey = "3e70ababa44645128b2828478b13d3f2";
  if (!apiKey) {
    return res.status(500).json({ error: "Chave de API de notícias não configurada." });
  }

  try {
    // 1️⃣ Tenta top-headlines (BR, economia)
    let response = await fetch(
      `https://newsapi.org/v2/top-headlines?country=br&category=business&apiKey=${apiKey}`,
      { cache: "no-store" }
    );

    let data = await response.json();

    // 2️⃣ Se não houver artigos, tenta everything
    if (!data.articles || data.articles.length === 0) {
      response = await fetch(
        `https://newsapi.org/v2/everything?q=mercado+financeiro&language=pt&sortBy=publishedAt&apiKey=${apiKey}`,
        { cache: "no-store" }
      );
      data = await response.json();
    }

    // 3️⃣ Se ainda não houver artigos, devolve fallback estático
    if (!data.articles || data.articles.length === 0) {
      return res.status(200).json([
        {
          id: "fallback-1",
          titulo: "Sem notícias no momento",
          descricao: "Não encontramos notícias atualizadas na fonte configurada.",
          link: "#",
          data: new Date().toISOString(),
          fonte: "Sistema",
          imagem: null,
        },
      ]);
    }

    // 4️⃣ Mapeia as notícias reais
    const noticias: Noticia[] = data.articles.map((art: any, idx: number) => ({
      id: art.url ?? String(idx),
      titulo: art.title || "",
      descricao: art.description || "",
      link: art.url,
      data: art.publishedAt,
      fonte: art.source?.name || "",
      imagem: art.urlToImage || null,
    }));

    res.setHeader("Cache-Control", "no-store, max-age=0");
    res.status(200).json(noticias);
  } catch (err: any) {
    console.error("❌ Erro ao buscar notícias:", err.message);
    res.status(500).json({ error: "Falha ao buscar notícias externas." });
  }
}
