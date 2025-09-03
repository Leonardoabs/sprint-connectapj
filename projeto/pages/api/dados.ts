import type { NextApiRequest, NextApiResponse } from "next";
import * as XLSX from "xlsx";
import path from "path";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Caminho do arquivo Excel
    const filePath = path.join(process.cwd(), "public", "Challenge FIAP - Bases.xlsx");
    const workbook = XLSX.readFile(filePath);

    // Base 1 - Clientes
    const wsClientes = workbook.Sheets["Base 1 - ID"];
    const clientes = XLSX.utils.sheet_to_json(wsClientes);

    // Base 2 - Transações
    const wsTransacoes = workbook.Sheets["Base 2 - Transações"];
    const transacoes = XLSX.utils.sheet_to_json(wsTransacoes);

    res.status(200).json({ clientes, transacoes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao ler o Excel" });
  }
}
