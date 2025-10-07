"use client";
import { useEffect, useState, useMemo } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { X, Trophy, TrendingUp, TrendingDown } from "lucide-react";
import { FaDollarSign, FaExchangeAlt, FaCashRegister } from "react-icons/fa";
import { Bar } from "react-chartjs-2";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

interface ClienteResumo {
  id: string;
  faturamento: number;
  transacoes: number;
  recebido: number;
  pago: number;
}

interface Transacao {
  ID_PGTO: string;
  ID_RCBE: string;
  VL: number;
}

export default function RedesTab() {
  const [clientes, setClientes] = useState<ClienteResumo[]>([]);
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchID, setSearchID] = useState("");
  const [clienteSelecionado, setClienteSelecionado] = useState<string | null>(null);
  const [detalhesTransacoes, setDetalhesTransacoes] = useState<Transacao[]>([]);

  const [pagina, setPagina] = useState(1);
  const [modalPagina, setModalPagina] = useState(1);
  const itensPorPagina = 10;
  const itensPorModal = 10;

  useEffect(() => {
    async function fetchDados() {
      try {
        const [resClientes, resTransacoes] = await Promise.all([
          fetch("/clientes.json"),
          fetch("/transacoes.json"),
        ]);

        const clientesJson = await resClientes.json();
        const transacoesJson = await resTransacoes.json();

        // Montar resumo das transações
        const resumo: Record<string, { recebido: number; pago: number; transacoes: number }> = {};

        transacoesJson.forEach((t: Transacao) => {
          if (!resumo[t.ID_RCBE]) resumo[t.ID_RCBE] = { recebido: 0, pago: 0, transacoes: 0 };
          resumo[t.ID_RCBE].recebido += Number(t.VL) || 0;
          resumo[t.ID_RCBE].transacoes += 1;

          if (!resumo[t.ID_PGTO]) resumo[t.ID_PGTO] = { recebido: 0, pago: 0, transacoes: 0 };
          resumo[t.ID_PGTO].pago += Number(t.VL) || 0;
          resumo[t.ID_PGTO].transacoes += 1;
        });

        const clientesResumo: ClienteResumo[] = clientesJson.map((c: any) => ({
          id: c.ID,
          faturamento: Number(c.VL_FATU ?? 0),
          transacoes: resumo[c.ID]?.transacoes ?? 0,
          recebido: resumo[c.ID]?.recebido ?? 0,
          pago: resumo[c.ID]?.pago ?? 0,
        }));

        setClientes(clientesResumo);
        setTransacoes(transacoesJson);
      } catch (err) {
        console.error("Erro ao carregar dados:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchDados();
  }, []);

  const selecionarCliente = (id: string) => {
    setClienteSelecionado(id);
    setModalPagina(1);
    setDetalhesTransacoes(transacoes.filter((t) => t.ID_PGTO === id || t.ID_RCBE === id));
  };


  const gerarRelatorio = () => {
    if (!clienteSelecionado) return;
    const cliente = clientes.find((c) => c.id === clienteSelecionado);
    if (!cliente) return;

    const doc = new jsPDF("p", "mm", "a4");
    

    // === Cabeçalho ===
    const pageWidth = doc.internal.pageSize.getWidth();
    const headerHeight = 25;
    const redColor: [number, number, number] = [180, 0, 0];

    // Fundo vermelho no topo
    doc.setFillColor(redColor[0], redColor[1], redColor[2]);
    doc.rect(0, 0, pageWidth, headerHeight, "F");

    // Logo Santander (ajuste tamanho conforme a imagem)
    // doc.addImage('url("/santander_logo.png")', "PNG", 14, 5, 30, 12);

    // Título principal
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.text(`Relatório do Cliente: ${clienteSelecionado}`, 50, 15);

    // === Seção de Informações Gerais ===
    doc.setFontSize(12);
    doc.setTextColor(60);
    doc.text("Resumo Financeiro", 14, 40);

    doc.setFontSize(11);
    doc.text(`Total Recebido: R$ ${(cliente.recebido ?? 0).toLocaleString()}`, 14, 48);
    doc.text(`Total Pago: R$ ${(cliente.pago ?? 0).toLocaleString()}`, 14, 56);

    // === Tabela de Transações ===
    const body = detalhesTransacoes.map((t) => [
      t.ID_PGTO,
      t.ID_RCBE,
      `R$ ${t.VL.toLocaleString()}`,
      t.ID_RCBE === clienteSelecionado ? `R$ ${t.VL.toLocaleString()}` : "-",
      t.ID_PGTO === clienteSelecionado ? `R$ ${t.VL.toLocaleString()}` : "-",
    ]);

    autoTable(doc, {
      startY: 65,
      head: [["Pagador", "Recebedor", "Valor", "Recebido", "Pago"]],
      body,
      headStyles: {
        fillColor: redColor,
        textColor: 255,
        fontStyle: "bold",
        halign: "center",
      },
      styles: {
        fontSize: 10,
        cellPadding: 4,
        textColor: 40,
        lineWidth: 0.1,
      },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 30 },
        2: { halign: "right" },
        3: { halign: "right", textColor: [0, 150, 0] },
        4: { halign: "right", textColor: [0, 100, 200] },
      },
      margin: { left: 14, right: 14 },
    });

    // === Rodapé ===
    const pageHeight = doc.internal.pageSize.getHeight();
    const dataAtual = new Date().toLocaleDateString("pt-BR");

    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(
      `Gerado automaticamente pelo sistema ConnectaPJ Santander | ${dataAtual}`,
      14,
      pageHeight - 10
    );

    // === Salvar ===
    doc.save(`relatorio_${clienteSelecionado}.pdf`);
  };

  const clientesFiltrados = useMemo(() => {
    const filtrados = clientes.filter(
      (c) => c.id && c.id.toLowerCase().includes(searchID.toLowerCase())
    );
    const unicos = Object.values(
      filtrados.reduce((acc, c) => {
        acc[c.id] = c;
        return acc;
      }, {} as Record<string, ClienteResumo>)
    );
    return unicos;
  }, [clientes, searchID]);

  const totalPaginas = Math.ceil(clientesFiltrados.length / itensPorPagina);
  const clientesPaginaAtual = useMemo(
    () => clientesFiltrados.slice((pagina - 1) * itensPorPagina, pagina * itensPorPagina),
    [clientesFiltrados, pagina]
  );

  const clienteDetalhes = useMemo(
    () => clientes.find((c) => c.id === clienteSelecionado),
    [clientes, clienteSelecionado]
  );

  const top5 = useMemo(() => {
    const unicos = [...new Map(clientes.map(c => [c.id, c])).values()];
    return unicos
      .sort((a, b) => (b.recebido - b.pago) - (a.recebido - a.pago))
      .slice(0, 5);
  }, [clientes]);


  const maxTransacoes = useMemo(() => Math.max(...clientes.map((c) => c.transacoes), 1), [clientes]);

  const transacoesPaginaAtual = useMemo(() => {
    const start = (modalPagina - 1) * itensPorModal;
    return detalhesTransacoes.slice(start, start + itensPorModal);
  }, [detalhesTransacoes, modalPagina]);

  if (loading) return <p className="text-white text-center mt-20">⏳ Carregando dados...</p>;

  return (
    <div className="space-y-8 px-6 py-6">
      <h2 className="text-3xl font-bold text-red-600 mb-4">👥 Visão da Rede de Clientes</h2>

      {/* Top 5 */}
      <div>
        <h3 className="text-white font-extrabold text-2xl mb-6 flex items-center gap-3">
          <Trophy size={24} className="text-yellow-400" /> Top 5 Clientes (Saldo Líquido)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {top5.map((c, i) => {
            const saldo = (c.recebido ?? 0) - (c.pago ?? 0);
            return (
              <div
                key={`${c.id}_${i}`}
                onClick={() => selecionarCliente(c.id)}
                className="bg-gradient-to-tr from-gray-900 to-gray-800 p-6 rounded-2xl shadow-xl cursor-pointer hover:shadow-2xl hover:scale-105 transition-transform duration-300"
              >
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-white font-semibold text-lg truncate">{c.id}</h4>
                  <span className="text-gray-400 font-medium text-sm">#{i + 1}</span>
                </div>

                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <FaExchangeAlt className="text-cyan-400" />
                    <span className="text-gray-300 text-sm">{c.transacoes} Transações</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FaDollarSign className="text-green-400" />
                    <span className="text-green-400 font-semibold text-sm">
                      R$ {(c.recebido ?? 0).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-3">
                  <FaCashRegister className="text-red-400" />
                  <span className="text-red-400 font-medium text-sm">
                    R$ {(c.pago ?? 0).toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center gap-2 mb-4">
                  {saldo >= 0 ? <TrendingUp className="text-green-400" /> : <TrendingDown className="text-red-400" />}
                  <span className={`${saldo >= 0 ? "text-green-400" : "text-red-400"} font-bold`}>
                    Saldo: R$ {saldo.toLocaleString()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pesquisa */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Pesquisar ID/CNPJ..."
          className="bg-gray-800 text-white px-3 py-2 rounded-lg w-full md:w-1/3"
          value={searchID}
          onChange={(e) => {
            setSearchID(e.target.value);
            setPagina(1);
          }}
        />
      </div>

      {/* Tabela clientes */}
      <div className="bg-gray-900 p-4 rounded-xl shadow-md">
        <table className="w-full text-left text-gray-300">
          <thead className="bg-gray-800 sticky top-0">
            <tr>
              <th className="px-4 py-2">ID/CNPJ</th>
              <th className="px-4 py-2">Faturamento</th>
              <th className="px-4 py-2">Transações</th>
              <th className="px-4 py-2">Saldo Líquido</th>
              <th className="px-4 py-2">Ações</th>
            </tr>
          </thead>
          <tbody>
            {clientesPaginaAtual.map((c, i) => {
              const saldo = (c.recebido ?? 0) - (c.pago ?? 0);
              return (
                <tr
                  key={`${c.id}_${i}`}
                  className={`border-b border-gray-700 ${i % 2 === 0 ? "bg-gray-800" : ""} hover:bg-gray-700`}
                >
                  <td className="px-4 py-2">{c.id}</td>
                  <td className="px-4 py-2">R$ {(c.faturamento ?? 0).toLocaleString()}</td>
                  <td className="px-4 py-2">{c.transacoes}</td>
                  <td className={`px-4 py-2 font-bold ${saldo >= 0 ? "text-green-400" : "text-red-400"}`}>
                    R$ {saldo.toLocaleString()}
                  </td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => selecionarCliente(c.id)}
                      className="text-red-400 hover:text-red-600 underline"
                    >
                      Ver detalhes
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Paginação */}
        <div className="flex justify-end mt-4 gap-2">
          <button
            disabled={pagina === 1}
            onClick={() => setPagina(pagina - 1)}
            className="px-3 py-1 bg-gray-700 rounded disabled:opacity-50"
          >
            Anterior
          </button>
          <span className="px-2 py-1 text-gray-300">
            {pagina} / {totalPaginas}
          </span>
          <button
            disabled={pagina === totalPaginas}
            onClick={() => setPagina(pagina + 1)}
            className="px-3 py-1 bg-gray-700 rounded disabled:opacity-50"
          >
            Próximo
          </button>
        </div>
      </div>

      {/* Modal Detalhes */}
      {clienteSelecionado && clienteDetalhes && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-start pt-20 z-50 overflow-auto">
          <div className="bg-gray-900 p-6 rounded-2xl shadow-xl w-11/12 md:w-3/4 lg:w-1/2 max-h-[90vh] overflow-y-auto relative">
            <button
              onClick={() => setClienteSelecionado(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X size={24} />
            </button>

            <h3 className="text-white font-bold text-2xl mb-4">
              📌 Detalhes do Cliente: {clienteSelecionado}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-800 p-4 rounded-xl flex flex-col items-center">
                <FaDollarSign className="text-green-400 mb-2" size={24} />
                <span className="text-gray-300 text-sm">Recebido</span>
                <span className="text-green-400 font-bold text-lg">
                  R$ {(clienteDetalhes.recebido ?? 0).toLocaleString()}
                </span>
              </div>
              <div className="bg-gray-800 p-4 rounded-xl flex flex-col items-center">
                <FaCashRegister className="text-red-400 mb-2" size={24} />
                <span className="text-gray-300 text-sm">Pago</span>
                <span className="text-red-400 font-bold text-lg">
                  R$ {(clienteDetalhes.pago ?? 0).toLocaleString()}
                </span>
              </div>
              <div className="bg-gray-800 p-4 rounded-xl flex flex-col items-center">
                <FaExchangeAlt className="text-yellow-400 mb-2" size={24} />
                <span className="text-gray-300 text-sm">Saldo Líquido</span>
                <span
                  className={`font-bold text-lg ${(clienteDetalhes.recebido ?? 0) - (clienteDetalhes.pago ?? 0) >= 0
                      ? "text-green-400"
                      : "text-red-400"
                    }`}
                >
                  R$ {((clienteDetalhes.recebido ?? 0) - (clienteDetalhes.pago ?? 0)).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="mb-6 bg-gray-800 p-4 rounded-xl">
              <Bar
                data={{
                  labels: ["Recebido", "Pago"],
                  datasets: [
                    {
                      label: "Valores",
                      data: [clienteDetalhes.recebido ?? 0, clienteDetalhes.pago ?? 0],
                      backgroundColor: ["rgba(56, 161, 105, 0.8)", "rgba(229, 62, 62, 0.8)"],
                      borderRadius: 12,
                      maxBarThickness: 50,
                      borderSkipped: false,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      backgroundColor: "#1A202C",
                      titleColor: "#F7FAFC",
                      bodyColor: "#EDF2F7",
                      padding: 10,
                      cornerRadius: 8,
                      callbacks: {
                        label: (context) => {
                          const valor = context.raw as number;
                          return `R$ ${valor.toLocaleString()}`;
                        },
                      },
                    },
                  },
                  scales: {
                    x: {
                      ticks: { color: "#EDF2F7", font: { weight: "bold" } },
                      grid: { color: "#2d3748" },
                    },
                    y: {
                      ticks: {
                        color: "#EDF2F7",
                        font: { weight: "bold" },
                        callback: (val) => `R$ ${Number(val).toLocaleString()}`,
                      },
                      grid: { color: "#2d3748" },
                    },
                  },
                  animation: { duration: 800, easing: "easeOutQuart" },
                }}
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-gray-300 mb-4">
                <thead className="bg-gray-800 sticky top-0">
                  <tr>
                    <th className="px-4 py-2">Pagador</th>
                    <th className="px-4 py-2">Recebedor</th>
                    <th className="px-4 py-2">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {transacoesPaginaAtual.map((t, i) => (
                    <tr
                      key={`${t.ID_PGTO}_${i}`}
                      className={`border-b border-gray-700 ${i % 2 === 0 ? "bg-gray-800" : ""}`}
                    >
                      <td className="px-4 py-2">{t.ID_PGTO}</td>
                      <td className="px-4 py-2">{t.ID_RCBE}</td>
                      <td className="px-4 py-2">R$ {t.VL.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex justify-between items-center mt-2">
                <button
                  disabled={modalPagina === 1}
                  onClick={() => setModalPagina(modalPagina - 1)}
                  className="px-3 py-1 bg-gray-700 rounded disabled:opacity-50"
                >
                  Anterior
                </button>
                <button
                  onClick={gerarRelatorio}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
                >
                  Exportar PDF
                </button>
                <button
                  disabled={modalPagina * itensPorModal >= detalhesTransacoes.length}
                  onClick={() => setModalPagina(modalPagina + 1)}
                  className="px-3 py-1 bg-gray-700 rounded disabled:opacity-50"
                >
                  Próximo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
