"use client";
import { useEffect, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { X } from "lucide-react";
import { Trophy } from "lucide-react";
import { FaDollarSign, FaExchangeAlt, FaCashRegister } from "react-icons/fa";

interface Cliente {
  ID: string;
  VL_FATU: number;
  DS_CNAE: string;
  DT_ABRT: number;
  DT_REFE: number;
}

interface Transacao {
  ID_PGTO: string;
  ID_RCBE: string;
  VL: number;
  DS_TRAN: string;
  DT_REFE: number;
}

// 🔧 Conversão de número do Excel para Date
function excelSerialToDate(serial: number): Date {
  const excelEpoch = new Date(1899, 11, 30);
  return new Date(excelEpoch.getTime() + serial * 24 * 60 * 60 * 1000);
}

export default function RedesTab() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchID, setSearchID] = useState<string>("");

  const [clientesComTransacoes, setClientesComTransacoes] = useState<
    { id: string; faturamento: number; transacoes: number; recebido: number; pago: number }[]
  >([]);

  const [topEmpresas, setTopEmpresas] = useState<
    { id: string; transacoes: number; recebido: number; pago: number }[]
  >([]);

  const [clienteSelecionado, setClienteSelecionado] = useState<string | null>(null);
  const [detalhesTransacoes, setDetalhesTransacoes] = useState<Transacao[]>([]);

  useEffect(() => {
    async function carregarDados() {
      try {
        const res = await fetch("/api/dados");
        const data = await res.json();
        setClientes(data.clientes);
        setTransacoes(data.transacoes);
        setLoading(false);
      } catch (err) {
        console.error("Erro ao carregar dados:", err);
        setLoading(false);
      }
    }
    carregarDados();
  }, []);

  useEffect(() => {
    if (!loading) {
      const resumoPorCliente: Record<
        string,
        { transacoes: number; recebido: number; pago: number }
      > = {};

      transacoes.forEach((t) => {
        if (!resumoPorCliente[t.ID_PGTO])
          resumoPorCliente[t.ID_PGTO] = { transacoes: 0, recebido: 0, pago: 0 };
        if (!resumoPorCliente[t.ID_RCBE])
          resumoPorCliente[t.ID_RCBE] = { transacoes: 0, recebido: 0, pago: 0 };

        resumoPorCliente[t.ID_PGTO].transacoes += 1;
        resumoPorCliente[t.ID_PGTO].pago += t.VL;

        resumoPorCliente[t.ID_RCBE].transacoes += 1;
        resumoPorCliente[t.ID_RCBE].recebido += t.VL;
      });

      const listaClientes = clientes.map((c) => ({
        id: c.ID,
        faturamento: c.VL_FATU,
        transacoes: resumoPorCliente[c.ID]?.transacoes || 0,
        recebido: resumoPorCliente[c.ID]?.recebido || 0,
        pago: resumoPorCliente[c.ID]?.pago || 0,
      }));

      setClientesComTransacoes(listaClientes);

      const top5 = Object.entries(resumoPorCliente)
        .sort(([, a], [, b]) => b.transacoes - a.transacoes)
        .slice(0, 5)
        .map(([id, r]) => ({
          id,
          transacoes: r.transacoes || 0,
          recebido: r.recebido || 0,
          pago: r.pago || 0,
        }));

      setTopEmpresas(top5);
    }
  }, [loading, clientes, transacoes]);

  const selecionarCliente = (id: string) => {
    setClienteSelecionado(id);
    const detalhes = transacoes.filter((t) => t.ID_PGTO === id || t.ID_RCBE === id);
    setDetalhesTransacoes(detalhes);
  };

const gerarRelatorio = () => {
  if (!clienteSelecionado) return;

  const cliente = clientesComTransacoes.find((c) => c.id === clienteSelecionado);
  if (!cliente) return;

  const doc = new jsPDF();

  // Título
  doc.setFontSize(18);
  doc.setTextColor(180, 0, 0);
  doc.text(`Relatório do Cliente: ${clienteSelecionado}`, 14, 20);

  // Totais
  doc.setFontSize(12);
  doc.setTextColor(50);
  doc.text(`Total Recebido: R$ ${cliente.recebido.toLocaleString()}`, 14, 30);
  doc.text(`Total Pago: R$ ${cliente.pago.toLocaleString()}`, 14, 38);

  // Corpo da tabela
  const body = detalhesTransacoes.map((t) => [
    t.ID_PGTO,
    t.ID_RCBE,
    `R$ ${t.VL.toLocaleString()}`,
    t.DS_TRAN,
    `R$ ${t.ID_RCBE === clienteSelecionado ? t.VL.toLocaleString() : "0"}`, // Recebido
    `R$ ${t.ID_PGTO === clienteSelecionado ? t.VL.toLocaleString() : "0"}`, // Pago
  ]);

  autoTable(doc, {
    startY: 48,
    head: [["Pagador", "Recebedor", "Valor", "Tipo", "Recebido", "Pago"]],
    body: body,
    headStyles: {
      fillColor: [180, 0, 0], // Cabeçalho vermelho
      textColor: 255,
      fontStyle: "bold",
    },
    styles: {
      textColor: 0,          // Texto branco
      fontSize: 10,
      cellPadding: 3,
      fillColor: [165, 165, 165], // Fundo cinza escuro padrão para todas as linhas
    },
    columnStyles: {
      4: { fillColor: [0, 150, 0], textColor: 255 }, // Recebido verde
      5: { fillColor: [0, 123, 255], textColor: 255 }, // Pago azul
    },
    margin: { top: 48, left: 14, right: 14 },
  });

  doc.save(`relatorio_${clienteSelecionado}.pdf`);
};




  return (
    <div className="space-y-6 px-6 py-6">
      <h2 className="text-3xl font-bold text-red-600 mb-4">👥 Visão da Rede de Clientes</h2>

      {loading ? (
        <p className="text-white text-center mt-20">⏳ Carregando dados...</p>
      ) : (
        <>
{/* Top 5 Empresas */}
<div>
  <h3 className="text-white-500 font-bold text-xl mb-4 flex items-center gap-2">
    <Trophy size={20} /> Top 5 Empresas (Mais Transações)
  </h3>
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {topEmpresas.map((c, i) => (
      <div
        key={i}
        onClick={() => selecionarCliente(c.id)}
        className="bg-gradient-to-br from-gray-800 to-gray-700 p-5 rounded-xl shadow-lg cursor-pointer hover:shadow-2xl transition transform hover:-translate-y-1"
      >
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-white font-bold text-lg">{c.id}</h4>
          <span className="text-gray-400 text-sm">#{i + 1}</span>
        </div>

        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1">
            <FaExchangeAlt className="text-cyan-400" />
            <span className="text-gray-300 text-sm">{c.transacoes} Transações</span>
          </div>
          <div className="flex items-center gap-1">
            <FaDollarSign className="text-green-400" />
            <span className="text-green-400 text-sm">
              R$ {c.recebido.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <FaCashRegister className="text-red-400" />
            <span className="text-red-400 text-sm">
              R$ {c.pago.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Barra de progresso de transações */}
        <div className="mt-4 h-2 w-full bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-2 bg-red-500 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(c.transacoes * 10, 100)}%` }}
          ></div>
        </div>
      </div>
    ))}
  </div>
</div>


          {/* Campo de pesquisa */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="Pesquisar ID/CNPJ..."
              className="bg-gray-800 text-white px-3 py-2 rounded-lg w-full md:w-1/3"
              value={searchID}
              onChange={(e) => setSearchID(e.target.value)}
            />
          </div>

          {/* Lista de clientes */}
          <div className="bg-gray-900 p-6 rounded-xl shadow-md">
            <table className="w-full text-left text-gray-300">
              <thead className="bg-gray-800 sticky top-0">
                <tr>
                  <th className="px-4 py-2">ID/CNPJ</th>
                  <th className="px-4 py-2">Faturamento</th>
                  <th className="px-4 py-2">Transações</th>
                  <th className="px-4 py-2">Ações</th>
                </tr>
              </thead>
              <tbody>
                {clientesComTransacoes
                  .filter((c) => c.id.includes(searchID))
                  .map((c, i) => (
                    <tr
                      key={i}
                      className={`border-b border-gray-700 ${i % 2 === 0 ? "bg-gray-800" : ""} hover:bg-gray-700`}
                    >
                      <td className="px-4 py-2">{c.id}</td>
                      <td className="px-4 py-2">R$ {c.faturamento.toLocaleString()}</td>
                      <td className="px-4 py-2">{c.transacoes}</td>
                      <td className="px-4 py-2">
                        <button
                          onClick={() => selecionarCliente(c.id)}
                          className="text-red-400 hover:text-red-600 underline"
                        >
                          Ver detalhes
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {/* Modal Detalhes */}
          {clienteSelecionado && (
            <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50">
              <div className="bg-gray-900 p-6 rounded-xl shadow-lg w-11/12 md:w-2/3 lg:w-1/2 max-h-[80vh] overflow-y-auto relative">
                <button
                  onClick={() => setClienteSelecionado(null)}
                  className="absolute top-3 right-3 text-gray-400 hover:text-white"
                >
                  <X size={24} />
                </button>

                <h3 className="text-white font-bold mb-2">
                  📌 Detalhes do Cliente: {clienteSelecionado}
                </h3>

                <p className="text-green-400 mb-1">
                  💰 Total Recebido: R${" "}
                  {(clientesComTransacoes.find((c) => c.id === clienteSelecionado)?.recebido || 0).toLocaleString()}
                </p>
                <p className="text-yellow-400 mb-4">
                  💸 Total Pago: R${" "}
                  {(clientesComTransacoes.find((c) => c.id === clienteSelecionado)?.pago || 0).toLocaleString()}
                </p>

                <table className="w-full text-left text-gray-300 mb-4">
                  <thead className="bg-gray-800 sticky top-0">
                    <tr>
                      <th className="px-4 py-2">Pagador</th>
                      <th className="px-4 py-2">Recebedor</th>
                      <th className="px-4 py-2">Valor</th>
                      <th className="px-4 py-2">Tipo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detalhesTransacoes.map((t, i) => (
                      <tr
                        key={i}
                        className={`border-b border-gray-700 ${i % 2 === 0 ? "bg-gray-800" : ""} hover:bg-gray-700`}
                      >
                        <td className="px-4 py-2">{t.ID_PGTO}</td>
                        <td className="px-4 py-2">{t.ID_RCBE}</td>
                        <td className="px-4 py-2">R$ {t.VL.toLocaleString()}</td>
                        <td className="px-4 py-2">{t.DS_TRAN}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="flex justify-end mt-4">
                  <button
                    onClick={gerarRelatorio}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
                  >
                    📄 Gerar Relatório
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
