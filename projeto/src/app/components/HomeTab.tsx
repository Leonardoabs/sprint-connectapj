"use client";
import { useEffect, useState } from "react";
import { Line, Bar } from "react-chartjs-2";
import { FaDollarSign, FaExchangeAlt, FaCashRegister, FaUsers, FaFileAlt } from "react-icons/fa";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import jsPDF from "jspdf";

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend);

interface Cliente {
  ID: string;
  VL_FATU: number;
  VL_SLDO: number;
  DS_CNAE: string;
  DT_REFE: number;
}

interface Transacao {
  ID_PGTO: string;
  ID_RCBE: string;
  VL: number;
  DS_TRAN: string;
  DT_REFE: number;
}

// 🔧 conversão de número do Excel para Date
function excelSerialToDate(serial: number): Date {
  const excelEpoch = new Date(1899, 11, 30);
  return new Date(excelEpoch.getTime() + serial * 24 * 60 * 60 * 1000);
}

export default function HomeTab() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [mesSelecionado, setMesSelecionado] = useState<number | "all">("all");

  const [receitaMedia, setReceitaMedia] = useState(0);
  const [totalTransacoes, setTotalTransacoes] = useState(0);
  const [fluxoCaixa, setFluxoCaixa] = useState(0);
  const [clientesAtivos, setClientesAtivos] = useState(0);
  const [receitaPorMes, setReceitaPorMes] = useState<number[]>([0, 0, 0, 0, 0]);
  const [topRamos, setTopRamos] = useState<{ ramo: string; valor: number }[]>([]);
  const [topCNPJs, setTopCNPJs] = useState<{ cnpj: string; valor: number }[]>([]);

  // Meses para o gráfico
  const mesesOptions = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio"];
  // Meses para o filtro (removendo janeiro e fevereiro)
  const mesesOptionsFiltro = ["Março", "Abril", "Maio"];

  const atualizarKPIs = (clientes: Cliente[], transacoes: Transacao[], mes: number | "all") => {
    // Filtragem de clientes para Top Ramos e Top CNPJs
    const clientesFiltrados =
      mes === "all"
        ? clientes.filter((c) => {
            const m = excelSerialToDate(c.DT_REFE).getMonth();
            return m >= 2 && m <= 4; // Março a Maio
          })
        : clientes.filter((c) => excelSerialToDate(c.DT_REFE).getMonth() === mes);

    // Filtragem de transações para KPIs
    const transacoesFiltradas =
      mes === "all"
        ? transacoes.filter((t) => {
            const m = excelSerialToDate(t.DT_REFE).getMonth();
            return m >= 2 && m <= 4; // Março a Maio
          })
        : transacoes.filter((t) => excelSerialToDate(t.DT_REFE).getMonth() === mes);

    // KPIs
    setReceitaMedia(
      clientesFiltrados.length
        ? Math.round(clientesFiltrados.reduce((a, c) => a + c.VL_FATU, 0) / clientesFiltrados.length)
        : 0
    );
    setClientesAtivos(clientesFiltrados.length);
    setFluxoCaixa(transacoesFiltradas.reduce((a, t) => a + t.VL, 0));
    setTotalTransacoes(transacoesFiltradas.length);

    // Receita acumulada por mês (janeiro a maio)
    const meses = [0, 0, 0, 0, 0];
    transacoes.forEach((t) => {
      const m = excelSerialToDate(t.DT_REFE).getMonth();
      if (m >= 0 && m < 5) meses[m] += t.VL;
    });
    setReceitaPorMes(meses);

    // Top ramos
    const receitaPorRamo: Record<string, number> = {};
    clientesFiltrados.forEach((c) => {
      receitaPorRamo[c.DS_CNAE] = (receitaPorRamo[c.DS_CNAE] || 0) + c.VL_FATU;
    });
    const topR = Object.entries(receitaPorRamo)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([ramo, valor]) => ({ ramo, valor }));
    setTopRamos(topR);

    // Top empresas
    const receitaPorCNPJ: Record<string, number> = {};
    clientesFiltrados.forEach((c) => {
      receitaPorCNPJ[c.ID] = (receitaPorCNPJ[c.ID] || 0) + c.VL_FATU;
    });
    const topC = Object.entries(receitaPorCNPJ)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([cnpj, valor]) => ({ cnpj, valor }));
    setTopCNPJs(topC);
  };

  useEffect(() => {
    async function carregarDados() {
      try {
        const res = await fetch("/api/dados");
        const { clientes, transacoes } = await res.json();
        setClientes(clientes);
        setTransacoes(transacoes);

        atualizarKPIs(clientes, transacoes, "all"); // inicia com "Todos"
      } catch (err) {
        console.error("Erro ao carregar dados da API:", err);
      }
    }
    carregarDados();
  }, []);

  useEffect(() => {
    if (clientes.length && transacoes.length) {
      atualizarKPIs(clientes, transacoes, mesSelecionado);
    }
  }, [mesSelecionado]);

  const cards = [
    {
      title: "Receita Média",
      value: `R$ ${receitaMedia.toLocaleString()}`,
      icon: <FaDollarSign className="text-xl" />,
    },
    {
      title: "Transações",
      value: totalTransacoes.toLocaleString(),
      icon: <FaExchangeAlt className="text-xl" />,
    },
    {
      title: "Fluxo de Caixa",
      value: `R$ ${fluxoCaixa.toLocaleString()}`,
      icon: <FaCashRegister className="text-xl" />,
    },
    {
      title: "Clientes Ativos",
      value: clientesAtivos.toLocaleString(),
      icon: <FaUsers className="text-xl" />,
    },
  ];

  // 🔴 Gerar Relatório em PDF
  const gerarRelatorio = () => {
    const doc = new jsPDF();
    const nomeMes =
      mesSelecionado === "all" ? "Todos os meses" : mesesOptions[mesSelecionado];

    // Cabeçalho
    doc.setFontSize(16);
    doc.text("Relatório Financeiro - ConnectaPJ Santander", 10, 20);
    doc.setFontSize(12);
    doc.text(`Período: ${nomeMes}`, 10, 30);

    // KPIs
    doc.text(`Receita Média: R$ ${receitaMedia.toLocaleString()}`, 10, 50);
    doc.text(`Fluxo de Caixa: R$ ${fluxoCaixa.toLocaleString()}`, 10, 60);
    doc.text(`Transações: ${totalTransacoes.toLocaleString()}`, 10, 70);
    doc.text(`Clientes Ativos: ${clientesAtivos.toLocaleString()}`, 10, 80);

    // Top Ramos
    if (topRamos.length) {
      doc.text("Top 3 Ramos:", 10, 100);
      topRamos.forEach((r, i) => {
        doc.text(`${i + 1}. ${r.ramo} - R$ ${r.valor.toLocaleString()}`, 15, 110 + i * 10);
      });
    }

    // Top Empresas
    if (topCNPJs.length) {
      doc.text("Top 5 Empresas:", 10, 150);
      topCNPJs.forEach((c, i) => {
        doc.text(`${i + 1}. ${c.cnpj} - R$ ${c.valor.toLocaleString()}`, 15, 160 + i * 10);
      });
    }

    // Salvar PDF
    doc.save(`relatorio_${nomeMes}.pdf`);
  };

  return (
    <div className="space-y-6 px-6 md:px-12 py-6">
      {/* Cabeçalho */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-red-600">
          ConnectaPJ - Painel Financeiro Santander
        </h1>
        <p className="mt-1 text-gray-400 text-sm md:text-base">
          Análise integrada de indicadores financeiros de clientes do Santander
        </p>
        <hr className="mt-3 border-gray-700 w-1/2 mx-auto" />
      </div>

      {/* Filtro por mês + botão relatório */}
      <div className="flex justify-between items-center">
        <select
          className="bg-gray-800 text-white px-3 py-1 rounded-md text-sm"
          value={mesSelecionado}
          onChange={(e) =>
            setMesSelecionado(e.target.value === "all" ? "all" : Number(e.target.value))
          }
        >
          <option value="all">Todos</option>
          {mesesOptionsFiltro.map((mes, i) => (
            <option key={i} value={i + 2}>
              {mes}
            </option>
          ))}
        </select>

        <button
          onClick={gerarRelatorio}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md text-sm shadow"
        >
          <FaFileAlt /> Gerar Relatório
        </button>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div
            key={card.title}
            className="flex items-center p-3 bg-gradient-to-br from-red-600/70 to-red-700/80 rounded-xl shadow hover:scale-105 transform transition"
          >
            <div className="p-3 bg-red-800 rounded-full flex items-center justify-center mr-3">
              {card.icon}
            </div>
            <div>
              <p className="text-gray-200 font-medium text-sm">{card.title}</p>
              <p className="text-white text-lg font-bold mt-1">{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Gráfico de Evolução Mensal da Receita */}
      <div className="bg-gray-900 p-4 rounded-xl shadow-md h-64">
        <h3 className="text-white font-bold mb-2">Evolução Mensal da Receita</h3>
        <Line
          data={{
            labels: mesesOptions,
            datasets: [
              {
                label: "Receita",
                data: receitaPorMes,
                borderColor: "#ec0000",
                backgroundColor: "rgba(236,0,0,0.2)",
                tension: 0.4,
                fill: true,
                pointRadius: 4,
              },
            ],
          }}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { labels: { color: "#fff" } } },
            scales: {
              x: { ticks: { color: "#fff" }, grid: { color: "#444" } },
              y: { ticks: { color: "#fff" }, grid: { color: "#444" } },
            },
          }}
        />
      </div>

      {/* Top Ramos e Top CNPJs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top 3 Ramos */}
        <div className="bg-gray-900 p-4 rounded-xl shadow-md h-64">
          <h3 className="text-white font-bold mb-2">
            Top 3 Ramos ({mesSelecionado === "all" ? "Todos" : mesesOptions[mesSelecionado]})
          </h3>
          <Bar
            data={{
              labels: topRamos.map((r) => r.ramo),
              datasets: [
                {
                  label: "Receita",
                  data: topRamos.map((r) => r.valor),
                  backgroundColor: topRamos.map(
                    (_, i) => `rgba(236,0,0,${0.7 - i * 0.15})`
                  ),
                  borderRadius: 6,
                },
              ],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { display: false },
                tooltip: {
                  backgroundColor: "#ec0000",
                  titleColor: "#fff",
                  bodyColor: "#fff",
                },
              },
              scales: {
                x: { ticks: { color: "#fff" }, grid: { color: "#444" } },
                y: { ticks: { color: "#fff" }, grid: { color: "#444" } },
              },
            }}
          />
        </div>

        {/* Top 5 CNPJs */}
        <div className="bg-gray-900 p-4 rounded-xl shadow-md overflow-auto max-h-64">
          <h3 className="text-white font-bold mb-2">
            Top 5 Empresas ({mesSelecionado === "all" ? "Todos" : mesesOptions[mesSelecionado]})
          </h3>
          <ul className="text-gray-200 text-sm">
            {topCNPJs.length ? (
              topCNPJs.map((c, i) => (
                <li
                  key={i}
                  className="py-2 border-b border-gray-700 flex justify-between items-center hover:bg-gray-800 transition rounded px-2"
                >
                  <span className="truncate">{c.cnpj}</span>
                  <span className="font-semibold">
                    R$ {c.valor.toLocaleString()}
                  </span>
                </li>
              ))
            ) : (
              <li className="py-2 text-gray-400">Nenhum dado neste mês</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
