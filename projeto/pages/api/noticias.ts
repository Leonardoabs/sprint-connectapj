// src/pages/api/noticias.ts
import type { NextApiRequest, NextApiResponse } from "next";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const noticias = [
    {
      id: "1",
      titulo: "Ibovespa fecha em alta com resultados corporativos positivos",
      descricao: "O índice Bovespa subiu 1,2% impulsionado por grandes empresas que divulgaram lucros acima do esperado.",
      link: "https://www.infomoney.com.br/mercados/ibovespa-fecha-em-alta/",
      data: "2025-09-26T10:30:00Z",
      fonte: "InfoMoney",
      imagem: null
    },
    {
      id: "2",
      titulo: "Mercado de câmbio: dólar recua frente ao real",
      descricao: "O dólar fechou em baixa de 0,8% diante do real, refletindo dados econômicos favoráveis.",
      link: "https://www.valor.com.br/mercados/dolar-recua-frente-ao-real",
      data: "2025-09-26T09:45:00Z",
      fonte: "Valor Econômico",
      imagem: null
    },
    {
      id: "3",
      titulo: "Setor de tecnologia impulsiona ações na B3",
      descricao: "As ações de empresas de tecnologia tiveram alta média de 2% após anúncios de novos investimentos.",
      link: "https://www.bloomberg.com.br/setor-tecnologia-b3/",
      data: "2025-09-25T16:00:00Z",
      fonte: "Bloomberg",
      imagem: null
    },
    {
      id: "4",
      titulo: "Taxa de juros mantém estabilidade e impacta investimentos",
      descricao: "O Banco Central decidiu manter a taxa de juros, trazendo estabilidade para o mercado de crédito.",
      link: "https://www.g1.globo.com/economia/taxa-de-juros-estabilidade/",
      data: "2025-09-25T14:30:00Z",
      fonte: "G1 Economia",
      imagem: null
    },
    {
      id: "5",
      titulo: "Empresas de energia renovável registram crescimento expressivo",
      descricao: "O setor de energia renovável teve valorização significativa nas bolsas brasileiras nesta semana.",
      link: "https://www.tecmundo.com.br/energia/empresas-renovavel-crescimento.htm",
      data: "2025-09-24T11:00:00Z",
      fonte: "TecMundo",
      imagem: null
    }
  ];

  res.status(200).json(noticias);
}
