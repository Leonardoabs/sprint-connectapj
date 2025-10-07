"use client";
import { useState, useEffect } from "react";
import { Line, Pie } from "react-chartjs-2";
import * as XLSX from "xlsx";
import { FaRobot } from "react-icons/fa";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import { BarElement, Title } from "chart.js";

ChartJS.register(BarElement, Title);
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend
);

interface Cliente {
  ID: string;
  VL_FATU: number;
  VL_SLDO: number;
  DS_CNAE: string;
  DT_REFE: string | number;
}

interface Transacao {
  ID_PGTO: string;
  ID_RCBE: string;
  VL: number;
  DS_TRAN: string;
  DT_REFE: string | number;
}

// 🔹 Converte número serial Excel → string YYYY-MM-DD
function excelDateToJSDate(serial: number): string {
  const excelEpoch = new Date(1900, 0, 1);
  const jsDate = new Date(excelEpoch.getTime() + (serial - 2) * 86400000);
  return jsDate.toISOString().split("T")[0];
}

// 🔹 Calcula nível de maturidade
function calcularMaturidade(cliente: Cliente, transacoesCliente: Transacao[]): string {
  const dataInicio = new Date(cliente.DT_REFE);
  const hoje = new Date();
  const idadeMeses =
    (hoje.getFullYear() - dataInicio.getFullYear()) * 12 +
    (hoje.getMonth() - dataInicio.getMonth());

  const totalTransacoes = transacoesCliente.reduce((acc, t) => acc + t.VL, 0);

  const meses = [...new Set(transacoesCliente.map((t) => t.DT_REFE))].sort();
  let crescimento = 0;

  if (meses.length >= 2) {
    const ultimoMes = transacoesCliente
      .filter((t) => t.DT_REFE === meses[meses.length - 1])
      .reduce((a, t) => a + t.VL, 0);
    const penultimoMes = transacoesCliente
      .filter((t) => t.DT_REFE === meses[meses.length - 2])
      .reduce((a, t) => a + t.VL, 0);
    crescimento = penultimoMes > 0 ? (ultimoMes - penultimoMes) / penultimoMes : 0;
  }

  const percentualTransacoes = cliente.VL_FATU > 0 ? totalTransacoes / cliente.VL_FATU : 0;
  const saldo = cliente.VL_SLDO;

  if (idadeMeses < 24 && percentualTransacoes < 0.5) return "Início";
  if (crescimento > 0.15 && percentualTransacoes > 0.3 && saldo >= 0) return "Expansão";
  if (Math.abs(crescimento) < 0.05 && percentualTransacoes >= 0.5 && saldo >= 0)
    return "Maturidade";
  return "Declínio";
}

// 🔹 Gera recomendação automática
function gerarRecomendacao(maturidade: string): string {
  if (maturidade === "Início") return "Cliente em início de relacionamento";
  if (maturidade === "Expansão") return "Cliente potencial para aumentar faturamento";
  if (maturidade === "Maturidade") return "Cliente consolidado";
  if (maturidade === "Declínio") return "Cliente com risco de churn";
  return "";
}

// 🔹 Converte maturidade em nota 0-10 (NGC: Nota Geral do Cliente)
function maturidadeParaNota(maturidade: string): number {
  switch (maturidade) {
    case "Início":
      return 4;
    case "Expansão":
      return 7;
    case "Maturidade":
      return 9;
    case "Declínio":
      return 2;
    default:
      return 0;
  }
}

export default function ClienteTab() {
  const [cnpj, setCnpj] = useState("");
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [clienteBase, setClienteBase] = useState<any>(null);
  const [clienteSaldo, setClienteSaldo] = useState<string>("");
  const [evolucaoData, setEvolucaoData] = useState<any>(null);
  const [transacoesData, setTransacoesData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [mesSelecionado, setMesSelecionado] = useState<string>("");
  const [ngc, setNGC] = useState<number | null>(null);

  // 🔹 Estados dos modais
  const [showModalRelacionamento, setShowModalRelacionamento] = useState(false);
  const [showModalMaturidade, setShowModalMaturidade] = useState(false);
  const [showModalRisco, setShowModalRisco] = useState(false);
  const [showModalSaude, setShowModalSaude] = useState(false);

  // 🔹 Chat IA
  const [showIAChat, setShowIAChat] = useState(false);
  const [mensagens, setMensagens] = useState<{ user: string; ia: string }[]>([]);
  const [inputMsg, setInputMsg] = useState("");

  // 🔹 Carrega dados
  useEffect(() => {
    async function carregarDados() {
      try {
        const [resClientes, resTransacoes] = await Promise.all([
          fetch("/clientes.json"),
          fetch("/transacoes.json"),
        ]);

        const clientesJson = await resClientes.json();
        const transacoesJson = await resTransacoes.json();

        const clientesFormatados = clientesJson.map((c: Cliente) => ({
          ...c,
          DT_REFE:
            typeof c.DT_REFE === "number"
              ? excelDateToJSDate(c.DT_REFE)
              : String(c.DT_REFE),
        }));

        const transacoesFormatadas = transacoesJson.map((t: Transacao) => ({
          ...t,
          DT_REFE:
            typeof t.DT_REFE === "number"
              ? excelDateToJSDate(t.DT_REFE)
              : String(t.DT_REFE),
        }));

        setClientes(clientesFormatados);
        setTransacoes(transacoesFormatadas);
      } catch (err) {
        console.error("Erro ao carregar dados:", err);
      }
    }
    carregarDados();
  }, []);


  // 🔹 Busca cliente pelo CNPJ
  const buscarCliente = () => {
    setLoading(true);
    setTimeout(() => {
      const cnpjFinal = cnpj.startsWith("CNPJ_") ? cnpj : `CNPJ_${cnpj}`;
      const cliente = clientes.filter((c) => c.ID === cnpjFinal);

      if (!cliente || cliente.length === 0) {
        setClienteBase(null);
        setClienteSaldo("");
        setEvolucaoData(null);
        setTransacoesData(null);
        setNGC(null);
        setLoading(false);
        return;
      }

      const mesesDisponiveis = [...new Set(cliente.map((c) => String(c.DT_REFE)))];
      if (!mesSelecionado && mesesDisponiveis.length > 0)
        setMesSelecionado(mesesDisponiveis[0]);

      const transacoesCliente = transacoes.filter((t) => t.ID_PGTO === cnpjFinal);

      const maturidade = calcularMaturidade(cliente[0], transacoesCliente);
      const recomendacao = gerarRecomendacao(maturidade);
      const nota = maturidadeParaNota(maturidade);

      setNGC(nota);

      setClienteBase({
        setor: cliente[0].DS_CNAE,
        totalEnviado: `R$ ${cliente[0].VL_FATU.toLocaleString()}`,
        mesesDisponiveis,
        cliente,
        maturidade,
        recomendacao,
        saldo: `R$ ${cliente[0].VL_SLDO.toLocaleString()}`,
      });

      // Evolução mensal
      const meses = [
        "Jan",
        "Fev",
        "Mar",
        "Abr",
        "Mai",
        "Jun",
        "Jul",
        "Ago",
        "Set",
        "Out",
        "Nov",
        "Dez",
      ];

      const evolucao = meses.map(
        (_, i) =>
          transacoesCliente
            .filter((t) => new Date(t.DT_REFE).getMonth() === i)
            .reduce((a, t) => a + t.VL, 0)
      );

      setEvolucaoData({
        labels: meses,
        datasets: [
          {
            label: "",
            data: evolucao,
            borderColor: "#EC0000",
            backgroundColor: "rgba(236,0,0,0.2)",
            tension: 0.3,
            pointRadius: 4,
          },
        ],
      });

      // Distribuição por tipo
      const tipos = [...new Set(transacoesCliente.map((t) => t.DS_TRAN))];
      const distribuicao = tipos.map((t) =>
        transacoesCliente
          .filter((tx) => tx.DS_TRAN === t)
          .reduce((a, tx) => a + tx.VL, 0)
      );

      setTransacoesData({
        labels: tipos,
        datasets: [
          {
            label: "",
            data: distribuicao,
            backgroundColor: [
              "#EC0000",
              "#FF4D4D",
              "#FF8C42",
              "#FFD166",
              "#06D6A0",
              "#118AB2",
            ],
            borderColor: "#1f2937",
            borderWidth: 2,
          },
        ],
      });

      setLoading(false);
    }, 1000);
  };

  // 🔹 Atualiza saldo ao trocar mês
  useEffect(() => {
    if (!clienteBase || !mesSelecionado) return;
    const clienteMes = clienteBase.cliente.find(
      (c: Cliente) => c.DT_REFE === mesSelecionado
    );
    if (clienteMes) setClienteSaldo(`R$ ${clienteMes.VL_SLDO.toLocaleString()}`);
  }, [mesSelecionado, clienteBase]);

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { labels: { color: "#fff" } },
      tooltip: {
        backgroundColor: "#EC0000",
        titleColor: "#fff",
        bodyColor: "#fff",
      },
    },
    scales: {
      x: { ticks: { color: "#fff" }, grid: { color: "#444" } },
      y: { ticks: { color: "#fff" }, grid: { color: "#444" } },
    },
  };

  // 🔹 Exporta relatório Excel
  const gerarRelatorio = async () => {
    if (!cnpj) return alert("Digite um CNPJ primeiro!");
    const cnpjFinal = cnpj.startsWith("CNPJ_") ? cnpj : `CNPJ_${cnpj}`;
    const clienteSelecionado = clientes.filter((c) => c.ID === cnpjFinal);
    const transacoesSelecionadas = transacoes.filter((t) => t.ID_PGTO === cnpjFinal);

    if (clienteSelecionado.length === 0 && transacoesSelecionadas.length === 0) {
      return alert("Nenhum dado encontrado para este CNPJ.");
    }

    const clienteComRecomendacao = clienteSelecionado.map((c) => ({
      ...c,
      Recomendacao: clienteBase?.recomendacao || "",
      NGC: ngc ?? "",
    }));

    const wb = new ExcelJS.Workbook();
    const corPrimaria = "C40C0C";

    // === Planilha Clientes ===
    const wsClientes = wb.addWorksheet("Clientes");
    const headersClientes = Object.keys(clienteComRecomendacao[0] || {});
    wsClientes.addRow(headersClientes);
    clienteComRecomendacao.forEach((row) => wsClientes.addRow(Object.values(row)));

    const headerRowClientes = wsClientes.getRow(1);
    headerRowClientes.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: corPrimaria } };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = {
        top: { style: "thin", color: { argb: "FF999999" } },
        left: { style: "thin", color: { argb: "FF999999" } },
        bottom: { style: "thin", color: { argb: "FF999999" } },
        right: { style: "thin", color: { argb: "FF999999" } },
      };
    });
    wsClientes.columns.forEach((col) => (col.width = 20));

    // === Planilha Transações ===
    const wsTransacoes = wb.addWorksheet("Transações");
    const headersTransacoes = Object.keys(transacoesSelecionadas[0] || {});
    wsTransacoes.addRow(headersTransacoes);
    transacoesSelecionadas.forEach((row) => wsTransacoes.addRow(Object.values(row)));

    const headerRowTransacoes = wsTransacoes.getRow(1);
    headerRowTransacoes.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: corPrimaria } };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = {
        top: { style: "thin", color: { argb: "FF999999" } },
        left: { style: "thin", color: { argb: "FF999999" } },
        bottom: { style: "thin", color: { argb: "FF999999" } },
        right: { style: "thin", color: { argb: "FF999999" } },
      };
    });
    wsTransacoes.columns.forEach((col) => (col.width = 20));

    const buffer = await wb.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Relatorio_${cnpjFinal}.xlsx`);
    alert("📊 Relatório Excel gerado com sucesso!");
  };

  // === COMPONENTE DE MODAL ===
  const Modal = ({ show, onClose, color, title, children }: any) => {
    if (!show) return null;
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
        <div
          className="rounded-2xl shadow-lg p-6 max-w-4xl text-white max-h-[90vh]   overflow-y-auto overflow-x-hidden"
          style={{
            backgroundColor: color,
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(255,255,255,0.4) rgba(255,255,255,0.1)',
          }}
        >
          <h2 className="text-2xl font-bold mb-4">{title}</h2>
          <div className="text-sm mb-4">{children}</div>
          <button
            onClick={onClose}
            className="mt-4 bg-black/30 px-4 py-2 rounded hover:bg-black/50 transition cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    );
  };
  const [showModalIVF, setShowModalIVF] = useState(false);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold mb-6">Visão por Cliente</h2>

      {/* Input CNPJ */}
      <div className="mb-6 flex gap-2">
        <input
          type="text"
          placeholder="Digite o CNPJ"
          value={cnpj}
          onChange={(e) => setCnpj(e.target.value)}
          className="border border-gray-700 p-2 rounded w-64 bg-gray-800 text-white"
        />
        <button
          onClick={buscarCliente}
          className="bg-red-700 text-white px-4 py-2 rounded-lg shadow"
        >
          Buscar
        </button>
        <button
          onClick={gerarRelatorio}
          className="bg-green-700 text-white px-4 py-2 rounded-lg shadow"
        >
          Gerar Relatório
        </button>
      </div>

      {loading && <p className="text-yellow-400 animate-pulse">🔎 Iniciando busca...</p>}

      {clienteBase && !loading && (
        <>
          {/* Filtro de mês */}
          <div className="mb-4">
            <label className="mr-2">Selecione o mês:</label>
            <select
              value={mesSelecionado}
              onChange={(e) => setMesSelecionado(e.target.value)}
              className="bg-gray-800 text-white border border-gray-700 rounded p-2"
            >
              {clienteBase.mesesDisponiveis.map((m: string) => {
                const [ano, mes] = m.split("-");
                const nomesMes = [
                  "janeiro",
                  "fevereiro",
                  "março",
                  "abril",
                  "maio",
                  "junho",
                  "julho",
                  "agosto",
                  "setembro",
                  "outubro",
                  "novembro",
                  "dezembro",
                ];
                return (
                  <option key={m} value={m}>
                    {`${nomesMes[parseInt(mes) - 1]} de ${ano}`}
                  </option>
                );
              })}
            </select>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-gray-800 shadow-md p-4 rounded-2xl">
              Setor<br />
              <span className="text-xl font-bold">{clienteBase.setor}</span>
            </div>
            <div className="bg-gray-800 shadow-md p-4 rounded-2xl">
              Valor Faturado<br />
              <span className="text-xl font-bold">{clienteBase.totalEnviado}</span>
            </div>
            <div className="bg-gray-800 shadow-md p-4 rounded-2xl">
              Valor Saldo<br />
              <span className="text-xl font-bold">{clienteSaldo}</span>
            </div>
          </div>

          {/* Gráficos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {evolucaoData && (
              <div className="bg-gray-800 shadow-md p-4 rounded-2xl flex flex-col items-center">
                <h3 className="font-semibold mb-2">Evolução das Transações</h3>
                <div className="w-[90%] h-[280px]">
                  <Line data={evolucaoData} options={chartOptions} />
                </div>
              </div>
            )}
            {transacoesData && (
              <div className="bg-gray-800 shadow-md p-4 rounded-2xl flex flex-col items-center">
                <h3 className="font-semibold mb-2">Distribuição por Tipo</h3>
                <div className="w-[280px] h-[280px]">
                  <Pie data={transacoesData} options={{ plugins: { legend: { position: "bottom", labels: { color: "#fff", padding: 20 } } } }} />
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">

            {/* === CARD 1: Nível de Maturidade === */}
            {ngc !== null && (
              <div className="relative bg-gradient-to-br from-red-700 to-red-800 shadow-lg rounded-2xl p-6 flex flex-col justify-between w-[350px] transition-transform transform hover:scale-[1.02] hover:shadow-xl">
                {/* Cabeçalho */}
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-white/70 uppercase text-xs font-semibold tracking-wide">
                      Nível de Maturidade
                    </span>
                    <h2 className="text-white text-2xl font-bold mt-1">
                      {clienteBase.maturidade}
                    </h2>
                    <p className="text-white/80 italic text-sm mt-1">
                      {clienteBase.recomendacao}
                    </p>
                  </div>

                  {/* Ícone e nota */}
                  <div className="bg-white/10 rounded-xl px-4 py-3 flex flex-col items-center justify-center backdrop-blur-md">
                    <span className="text-3xl">📊</span>
                    <span className="text-white text-lg font-bold mt-1">{ngc}/10</span>
                  </div>
                </div>

                {/* Linha divisória sutil */}
                <div className="h-[1px] bg-white/20 my-4"></div>

                {/* Rodapé */}
                <div className="flex justify-between items-center">
                  <span className="text-xs text-white/70">
                    Monitoramento contínuo
                  </span>
                  <button
                    onClick={() => setShowModalRelacionamento(true)}
                    className="bg-white/10 text-white px-4 py-1.5 rounded-lg hover:bg-white/20 transition flex items-center gap-1 cursor-pointer"
                  >
                    ℹ️ Detalhes
                  </button>
                </div>
              </div>
            )}

            {/* === CARD 2: Relacionamento Santander === */}
            <div className="relative bg-gradient-to-br from-red-700 to-red-800 shadow-lg rounded-2xl p-6 flex flex-col justify-between w-[350px] transition-transform transform hover:scale-[1.02] hover:shadow-xl">
              {/* Cabeçalho */}
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-white/70 uppercase text-xs font-semibold tracking-wide">
                    Relacionamento Santander
                  </span>
                  <h2 className="text-white text-2xl font-bold mt-1">
                    4 produtos ativos
                  </h2>
                </div>

                {/* Ícone */}
                <div className="bg-white/10 rounded-xl px-4 py-3 flex flex-col items-center justify-center backdrop-blur-md">
                  <span className="text-3xl">💳</span>
                </div>
              </div>

              <div className="h-[1px] bg-white/20 my-4"></div>

              {/* Rodapé */}
              <div className="flex justify-between items-center">
                <span className="text-xs text-white/70">
                  Monitoramento contínuo
                </span>
                <button
                  onClick={() => setShowModalSaude(true)}
                  className="bg-white/10 text-white px-4 py-1.5 rounded-lg hover:bg-white/20 transition flex items-center gap-1 cursor-pointer"
                >
                  ℹ️ Detalhes
                </button>
              </div>
            </div>

            {/* === CARD 3: Maturidade Digital === */}
            <div className="relative bg-gradient-to-br from-red-700 to-red-800 to-orange-700 shadow-lg rounded-2xl p-6 flex flex-col justify-between w-[350px] transition-transform transform hover:scale-[1.02] hover:shadow-xl">
              {/* Cabeçalho */}
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-white/70 uppercase text-xs font-semibold tracking-wide">
                    Maturidade Digital
                  </span>
                  <h2 className="text-white text-2xl font-bold mt-1">
                    92% das transações via canais digitais
                  </h2>
                </div>

                {/* Ícone */}
                <div className="bg-white/10 rounded-xl px-4 py-3 flex flex-col items-center justify-center backdrop-blur-md">
                  <span className="text-3xl">📲</span>
                </div>
              </div>

              <div className="h-[1px] bg-white/20 my-4"></div>

              {/* Rodapé */}
              <div className="flex justify-between items-center">
                <span className="text-xs text-white/70">
                  Monitoramento contínuo
                </span>
                <button
                  onClick={() => setShowModalMaturidade(true)}
                  className="bg-white/10 text-white px-4 py-1.5 rounded-lg hover:bg-white/20 transition flex items-center gap-1 cursor-pointer"
                >
                  ℹ️ Detalhes
                </button>
              </div>
            </div>





          </div>


          {/* === MODAL EVOLUÇÃO DA MATURIDADE === */}
          <Modal
            show={showModalRelacionamento}
            onClose={() => setShowModalRelacionamento(false)}
            color="#1f2937"
            title="Evolução da Maturidade"
          >
            <div className="max-h-[80vh] overflow-y-auto flex flex-col md:flex-row gap-6 rounded-2xl shadow-lg p-6 text-white items-stretch">

              {/* === Lado Esquerdo - Gráfico e análise visual === */}
              <div className="flex-1 flex flex-col justify-between">

                {/* Card de status atual */}
                <div className="flex items-center justify-between bg-white/10 rounded-xl p-3 mb-4">
                  <p className="text-sm text-white/80">
                    <strong className="text-white">Status atual:</strong> Declínio no nível de maturidade desde março.
                  </p>
                  <span className="text-sm font-bold bg-red-600 px-3 py-1 rounded-lg shadow-md">
                    ⚠️ Alto risco
                  </span>
                </div>

                {/* Descrição do gráfico */}
                <p className="mb-4 text-white/80 text-sm text-center">
                  Gráfico mostrando a evolução do nível de maturidade do cliente nos últimos meses.
                  Observa-se um declínio de março até maio.
                </p>

                {/* Gráfico */}
                <div className="bg-white/10 p-4 rounded-xl flex-1 flex items-center justify-center">
                  <Bar
                    data={{
                      labels: ["Março", "Abril", "Maio"],
                      datasets: [
                        {
                          label: "Nível de Maturidade",
                          data: [8, 4, 2],
                          backgroundColor: [
                            "rgba(239, 68, 68, 0.9)",
                            "rgba(248, 113, 113, 0.9)",
                            "rgba(252, 165, 165, 0.9)",
                          ],
                          borderRadius: 8,
                          borderSkipped: false,
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false, // 🔥 faz o gráfico preencher melhor a altura
                      plugins: {
                        legend: { display: false },
                        tooltip: {
                          callbacks: {
                            label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y}/10`,
                          },
                        },
                      },
                      scales: {
                        x: {
                          ticks: { color: "#FFFFFF", font: { size: 14 } },
                          grid: { color: "rgba(255,255,255,0.1)" },
                        },
                        y: {
                          beginAtZero: true,
                          max: 10,
                          ticks: { stepSize: 1, color: "#FFFFFF" },
                          grid: { color: "rgba(255,255,255,0.1)" },
                        },
                      },
                    }}
                  />
                </div>

                {/* Indicador abaixo do gráfico */}
                <p className="text-center mt-3 text-white/80 text-sm italic">
                  🟢 Maior maturidade registrada em <strong>Março</strong> (8/10)
                </p>
              </div>

              {/* === Lado Direito - Análises e insights === */}
              <div className="flex-1 flex flex-col justify-between space-y-4">
                <div>
                  <h1 className="text-xl font-bold text-white mb-2">Análise dos dados</h1>
                  <ul className="list-disc list-inside text-white/80 text-sm space-y-1">
                    <li>Verificação de quantos meses o cliente está ativo.</li>
                    <li>Somatória de todas as transações realizadas pelo cliente.</li>
                    <li>
                      Análise do crescimento entre os dois últimos meses:
                      <ul className="list-disc list-inside ml-5 mt-1 space-y-1">
                        <li>0–4 → Alto risco de churn</li>
                        <li>5–7 → Médio risco</li>
                        <li>8–10 → Cliente estável e fiel</li>
                      </ul>
                    </li>
                    <li>
                      Consideração dos dados e o saldo para classificar o relacionamento
                      como Início, Expansão, Maturidade ou Declínio.
                    </li>
                    <li>NGC: Nota Geral do Cliente (1-10)</li>
                  </ul>
                </div>

                {/* Seção de Insights automáticos */}
                <div className="bg-white/10 p-4 rounded-xl shadow-inner">
                  <h2 className="text-lg font-semibold text-white mb-2">💡 Insights automáticos</h2>
                  <ul className="list-disc list-inside text-white/80 text-sm space-y-1">
                    <li>Volume de transações reduziu em <strong>60%</strong> entre março e maio.</li>
                    <li>Saldo médio diário caiu abaixo da média do segmento.</li>
                    <li>Cliente demonstra <strong>alto risco de churn</strong> — sugerir ação comercial.</li>
                  </ul>
                </div>
              </div>
            </div>
          </Modal>

          <Modal
            show={showModalSaude}
            onClose={() => setShowModalSaude(false)}
            color="#1f2937"
            title="Relacionamento Santander"
          >
            <div className="space-y-6 p-4">

              {/* Nível de relacionamento */}
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Nível de Relacionamento</h2>
                <div className="relative group inline-block">
                  <span className="bg-[#CD7F32]/30 px-3 py-1 rounded-full text-sm font-semibold shadow-sm cursor-pointer">
                    🥉 Bronze
                  </span>
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 bg-gray-800 text-white text-xs rounded-md p-2 opacity-0 group-hover:opacity-100 transition-opacity text-center z-50">
                    Bronze: Cliente iniciante ou com poucos produtos ativos; serviços básicos.
                  </div>
                </div>
              </div>
              <hr className="border-white/20" />

              {/* Produtos ativos */}
              <div>
                <h2 className="text-lg font-semibold text-white mb-2">Tipos de transações</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

                  {/* Conta Corrente */}
                  <div className="relative group bg-white/10 p-4 rounded-lg flex items-center space-x-2 hover:bg-white/20 transition cursor-pointer">
                    <span className="text-2xl">💰</span>
                    <span className="text-white font-medium">Boleto</span>
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 bg-gray-800 text-white text-xs rounded-md p-2 opacity-0 group-hover:opacity-100 transition-opacity text-center z-50">
                      Última transação: 05/10/2025
                    </div>
                  </div>

                  {/* Crédito PJ */}
                  <div className="relative group bg-white/10 p-4 rounded-lg flex items-center space-x-2 hover:bg-white/20 transition cursor-pointer">
                    <span className="text-2xl">🏦</span>
                    <span className="text-white font-medium">TED</span>
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 bg-gray-800 text-white text-xs rounded-md p-2 opacity-0 group-hover:opacity-100 transition-opacity text-center z-50">
                      Última transação: 05/10/2025
                    </div>
                  </div>

                  <div className="relative group bg-white/10 p-4 rounded-lg flex items-center space-x-2 hover:bg-white/20 transition cursor-pointer">
                    <span className="text-2xl">⚙️</span>
                    <span className="text-white font-medium">Sistêmico</span>
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 bg-gray-800 text-white text-xs rounded-md p-2 opacity-0 group-hover:opacity-100 transition-opacity text-center z-50">
                      Última transação: 05/10/2025
                    </div>
                  </div>

                  {/* Maquininha */}
                  <div className="relative group bg-white/10 p-4 rounded-lg flex items-center space-x-2 hover:bg-white/20 transition cursor-pointer">
                    <span className="text-2xl">💸</span>
                    <span className="text-white font-medium">Pix</span>
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 bg-gray-800 text-white text-xs rounded-md p-2 opacity-0 group-hover:opacity-100 transition-opacity text-center z-50">
                      Última transação: 04/10/2025
                    </div>
                  </div>
                </div>
              </div>

              <hr className="border-white/20" />

              {/* Métrica usada */}
              <div>
                <h2 className="text-lg font-semibold text-white mb-1">Métrica usada</h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                  {/* Indicadores principais */}
                  <div className="bg-white/10 p-4 rounded-lg">
                    <p className="text-white/80 text-sm">Produtos ativos</p>
                    <p className="text-white text-xl font-bold">4</p>

                    <p className="text-white/80 text-sm mt-2">Total de transações</p>
                    <p className="text-white text-xl font-bold">132</p>

                    <p className="text-white/80 text-sm mt-2">Valor total de transferências</p>
                    <p className="text-white text-xl font-bold">R$ 11.884.324</p>

                  </div>

                  {/* Gráfico de evolução */}
                  <div className="bg-white/10 p-4 rounded-lg">
                    <p className="text-white/80 text-sm mb-2">Distribuição de produtos (maio)</p>
                    <div className="w-full h-32 flex items-end gap-15">
                      <div className="bg-[#C2410C] w-8 h-18 rounded-t"></div>
                      <div className="bg-[#FFD700] w-8 h-13 rounded-t"></div>
                      <div className="bg-[#00BFFF] w-8 h-9 rounded-t"></div>
                      <div className="bg-[#32CD32] w-8 h-26 rounded-t"></div>
                    </div>
                    <div className="flex justify-between mt-1 text-white/70 text-xs ">
                      <span>Boleto</span>
                      <span className="ml-2">TED</span>
                      <span>Sistêmico</span>
                      <span className="mr-2">Pix</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Modal>

          <Modal
            show={showModalMaturidade}
            onClose={() => setShowModalMaturidade(false)}
            color="#1f2937"
            title="Maturidade Digital"
          >
            <div className="space-y-6 p-4">
              {/* Insight */}
              <div>
                <h2 className="text-lg font-semibold text-white mb-1">Insight</h2>
                <p className="text-white/80 text-sm">“92% das transações via canais digitais.”</p>
              </div>

              <hr className="border-white/20" />

              {/* Base de dados */}
              <div>
                <h2 className="text-lg font-semibold text-white mb-1">Base de dados usada</h2>
                <p className="text-white/80 text-sm">DS_TRAN, VL</p>
              </div>

              <hr className="border-white/20" />

              {/* Métrica de transações */}
              <div>
                <h2 className="text-lg font-semibold text-white mb-1">Distribuição de transações</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="relative group bg-white/10 p-4 rounded-lg flex flex-col items-center hover:bg-white/20 transition cursor-pointer">
                    <span className="text-2xl">💸</span>
                    <span className="text-white font-medium">PIX</span>
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-32 bg-gray-800 text-white text-xs rounded-md p-2 opacity-0 group-hover:opacity-100 transition-opacity text-center z-50">
                      40%
                    </div>
                  </div>
                  <div className="relative group bg-white/10 p-4 rounded-lg flex flex-col items-center hover:bg-white/20 transition cursor-pointer">
                    <span className="text-2xl">🏦</span>
                    <span className="text-white font-medium">TED</span>
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-32 bg-gray-800 text-white text-xs rounded-md p-2 opacity-0 group-hover:opacity-100 transition-opacity text-center z-50">
                      25%
                    </div>
                  </div>
                  <div className="relative group bg-white/10 p-4 rounded-lg flex flex-col items-center hover:bg-white/20 transition cursor-pointer">
                    <span className="text-2xl">🧾</span>
                    <span className="text-white font-medium">Boleto</span>
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-32 bg-gray-800 text-white text-xs rounded-md p-2 opacity-0 group-hover:opacity-100 transition-opacity text-center z-50">
                      20%
                    </div>
                  </div>
                  <div className="relative group bg-white/10 p-4 rounded-lg flex flex-col items-center hover:bg-white/20 transition cursor-pointer">
                    <span className="text-2xl">⚙️</span>
                    <span className="text-white font-medium">Sistêmico</span>
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-32 bg-gray-800 text-white text-xs rounded-md p-2 opacity-0 group-hover:opacity-100 transition-opacity text-center z-50">
                      7%
                    </div>
                  </div>
                </div>
              </div>

              <hr className="border-white/20" />

              {/* Valor estratégico */}
              <div>
                <h2 className="text-lg font-semibold text-white mb-1">Valor Estratégico</h2>
                <p className="text-white/80 text-sm">
                  Mostra quão digitalmente engajado o cliente é — útil para direcionar produtos digitais.
                </p>
              </div>
            </div>
          </Modal>
        </>
      )}
    </div>
  );
}
