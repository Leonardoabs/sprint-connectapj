import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Método não permitido" });
  }

  try {
    console.log("Recebi requisição:", req.body);

    const backendRes = await fetch("http://localhost:8000/insights", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });

    const text = await backendRes.text(); // lê como texto
    try {
      const data = JSON.parse(text); // tenta converter para JSON
      return res.status(200).json(data);
    } catch (err) {
      console.error("Resposta do FastAPI não é JSON:", text);
      return res.status(backendRes.status).json({
        reply: "Erro no backend FastAPI",
        detalhes: text
      });
    }

  } catch (error) {
    console.error("Erro ao conectar no backend:", error);
    return res.status(500).json({ reply: "⚠️ Erro ao conectar ao servidor." });
  }
}
