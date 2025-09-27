// pages/api/cotacao.ts
import type { NextApiRequest, NextApiResponse } from "next";

interface Cotacao {
  nome: string;
  valor: string;
  variacao: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Lista de ativos que queremos
    const ativos = ["USD-BRL", "EUR-BRL", "BTC-BRL"];
    
    // Pegar dados da AwesomeAPI
    const resultados = await Promise.all(
      ativos.map(async (ativo) => {
        const resp = await fetch(`https://economia.awesomeapi.com.br/json/last/${ativo}`);
        const data = await resp.json();
        const key = Object.keys(data)[0];
        return {
          nome: data[key].name,
          valor: `R$ ${parseFloat(data[key].bid).toFixed(2)}`,
          variacao: `${parseFloat(data[key].pctChange).toFixed(2)}%`,
        };
      })
    );

    res.status(200).json(resultados);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao buscar cotações" });
  }
}
