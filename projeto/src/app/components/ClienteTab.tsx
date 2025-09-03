"use client";
import { useState, useEffect } from "react";
import { Line, Pie } from "react-chartjs-2";
import * as XLSX from "xlsx";
import { FaRobot } from "react-icons/fa";

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
  const idadeMeses = (hoje.getFullYear() - dataInicio.getFullYear()) * 12 + (hoje.getMonth() - dataInicio.getMonth());

  const totalTransacoes = transacoesCliente.reduce((acc, t) => acc + t.VL, 0);

  const meses = [...new Set(transacoesCliente.map(t => t.DT_REFE))].sort();
  let crescimento = 0;
  if (meses.length >= 2) {
    const ultimoMes = transacoesCliente.filter(t => t.DT_REFE === meses[meses.length - 1])
      .reduce((a, t) => a + t.VL, 0);
    const penultimoMes = transacoesCliente.filter(t => t.DT_REFE === meses[meses.length - 2])
      .reduce((a, t) => a + t.VL, 0);
    crescimento = penultimoMes > 0 ? (ultimoMes - penultimoMes) / penultimoMes : 0;
  }

  const percentualTransacoes = cliente.VL_FATU > 0 ? totalTransacoes / cliente.VL_FATU : 0;
  const saldo = cliente.VL_SLDO;

  if (idadeMeses < 24 && percentualTransacoes < 0.5) return "Início";
  if (crescimento > 0.15 && percentualTransacoes > 0.3 && saldo >= 0) return "Expansão";
  if (Math.abs(crescimento) < 0.05 && percentualTransacoes >= 0.5 && saldo >= 0) return "Maturidade";
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
    case "Início": return 4;
    case "Expansão": return 7;
    case "Maturidade": return 9;
    case "Declínio": return 2;
    default: return 0;
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

  // 🔹 Chat IA
  const [showIAChat, setShowIAChat] = useState(false);
  const [mensagens, setMensagens] = useState<{user: string, ia: string}[]>([]);
  const [inputMsg, setInputMsg] = useState("");

  // 🔹 Carrega dados da API
  useEffect(() => {
    async function carregarDados() {
      try {
        const res = await fetch("/api/dados");
        const data = await res.json();

        const clientesFormatados = data.clientes.map((c: Cliente) => ({
          ...c,
          DT_REFE: typeof c.DT_REFE === "number" ? excelDateToJSDate(c.DT_REFE) : String(c.DT_REFE),
        }));

        const transacoesFormatadas = data.transacoes.map((t: Transacao) => ({
          ...t,
          DT_REFE: typeof t.DT_REFE === "number" ? excelDateToJSDate(t.DT_REFE) : String(t.DT_REFE),
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
      if (!mesSelecionado && mesesDisponiveis.length > 0) setMesSelecionado(mesesDisponiveis[0]);

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
      });

      // Evolução mensal
      const meses = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
      const evolucao = meses.map((_, i) =>
        transacoesCliente
          .filter((t) => new Date(t.DT_REFE).getMonth() === i)
          .reduce((a, t) => a + t.VL, 0)
      );
      setEvolucaoData({
        labels: meses,
        datasets: [{
          label: "",
          data: evolucao,
          borderColor: "#EC0000",
          backgroundColor: "rgba(236,0,0,0.2)",
          tension: 0.3,
          pointRadius: 4,
        }],
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
        datasets: [{
          label: "",
          data: distribuicao,
          backgroundColor: ["#EC0000","#FF4D4D","#FF8C42","#FFD166","#06D6A0","#118AB2"],
          borderColor: "#1f2937",
          borderWidth: 2,
        }],
      });

      setLoading(false);
    }, 1000);
  };

  // 🔹 Atualiza saldo ao trocar mês
  useEffect(() => {
    if (!clienteBase || !mesSelecionado) return;
    const clienteMes = clienteBase.cliente.find((c: Cliente) => c.DT_REFE === mesSelecionado);
    if (clienteMes) setClienteSaldo(`R$ ${clienteMes.VL_SLDO.toLocaleString()}`);
  }, [mesSelecionado, clienteBase]);

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { labels: { color: "#fff" } },
      tooltip: { backgroundColor: "#EC0000", titleColor: "#fff", bodyColor: "#fff" },
    },
    scales: {
      x: { ticks: { color: "#fff" }, grid: { color: "#444" } },
      y: { ticks: { color: "#fff" }, grid: { color: "#444" } },
    },
  };

  // 🔹 Exporta relatório Excel
  const gerarRelatorio = () => {
    if (!cnpj) return alert("Digite um CNPJ primeiro!");

    const cnpjFinal = cnpj.startsWith("CNPJ_") ? cnpj : `CNPJ_${cnpj}`;
    const clienteSelecionado = clientes.filter((c) => c.ID === cnpjFinal);
    const transacoesSelecionadas = transacoes.filter((t) => t.ID_PGTO === cnpjFinal);

    if (clienteSelecionado.length === 0 && transacoesSelecionadas.length === 0) {
      return alert("Nenhum dado encontrado para este CNPJ.");
    }

    const clienteComRecomendacao = clienteSelecionado.map(c => ({
      ...c,
      Recomendacao: clienteBase?.recomendacao || "",
      NGC: ngc ?? "",
    }));

    const wsClientes = XLSX.utils.json_to_sheet(clienteComRecomendacao);
    const wsTransacoes = XLSX.utils.json_to_sheet(transacoesSelecionadas);
    const wb = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(wb, wsClientes, "Clientes");
    XLSX.utils.book_append_sheet(wb, wsTransacoes, "Transações");

    XLSX.writeFile(wb, `Relatorio_${cnpjFinal}.xlsx`);
    alert("Relatório gerado com sucesso!");
  };

  // 🔹 Simula IA respondendo
  const enviarMensagemIA = () => {
    if (!inputMsg.trim()) return;
    const userMsg = inputMsg;
    setMensagens(prev => [...prev, {user: userMsg, ia: ""}]);
    setInputMsg("");

    // Aqui você pode chamar sua API de IA real, por enquanto simula resposta
    setTimeout(() => {
      setMensagens(prev => prev.map(m => m.user === userMsg && m.ia === "" ? {...m, ia: `Resposta da IA para: "${userMsg}"`} : m));
    }, 1000);
  };

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
        <button onClick={buscarCliente} className="bg-red-700 text-white px-4 py-2 rounded-lg shadow">Buscar</button>
        <button onClick={gerarRelatorio} className="bg-green-700 text-white px-4 py-2 rounded-lg shadow">Gerar Relatório</button>
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
                const nomesMes = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
                return <option key={m} value={m}>{`${nomesMes[parseInt(mes)-1]} de ${ano}`}</option>;
              })}
            </select>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-gray-800 shadow-md p-4 rounded-2xl">Setor<br /><span className="text-xl font-bold">{clienteBase.setor}</span></div>
            <div className="bg-gray-800 shadow-md p-4 rounded-2xl">Valor Faturado<br /><span className="text-xl font-bold">{clienteBase.totalEnviado}</span></div>
            <div className="bg-gray-800 shadow-md p-4 rounded-2xl">Valor Saldo<br /><span className="text-xl font-bold">{clienteSaldo}</span></div>
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
                  <Pie data={transacoesData} options={{plugins:{legend:{position:"bottom", labels:{color:"#fff", padding:20}}}}} />
                </div>
              </div>
            )}
          </div>

          {/* Card de Maturidade / NGC */}
          {ngc !== null && (
            <div className="bg-red-700 shadow-md rounded-2xl px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4 max-w-3xl mx-auto">
              <div className="flex flex-col gap-1 text-center md:text-left">
                <span className="text-white/80 uppercase text-xs font-semibold tracking-wide">Nível de Maturidade</span>
                <span className="text-white text-2xl font-bold">{clienteBase.maturidade}</span>
                <span className="text-white/80 italic text-sm">{clienteBase.recomendacao}</span>
                <span className="text-white/80 text-[11px] mt-1">NGC: Nota Geral do Cliente (1-10)</span>
              </div>
              <div className="bg-red-600/70 backdrop-blur-md rounded-xl px-4 py-3 flex flex-col items-center justify-center min-w-[70px]">
                <span className="text-white text-2xl">📊</span>
                <span className="text-white text-2xl font-bold mt-1">{ngc}/10</span>
              </div>
            </div>
          )}

          {/* Botão flutuante IA */}
          <div className="fixed bottom-6 right-6 z-50">
            <button
              className="bg-red-600 hover:bg-red-900 text-white p-4 rounded-full shadow-lg"
              onClick={() => setShowIAChat(!showIAChat)}
            >
              <FaRobot size={24} />
            </button>
          </div>

          {/* Janela de chat IA */}
          {showIAChat && (
            <div className="fixed bottom-20 right-6 w-80 h-96 bg-gray-900 shadow-2xl rounded-xl flex flex-col overflow-hidden z-50">
              {/* Header */}
              <div className="bg-red-600 p-2 text-white font-semibold text-center">Chat IA</div>
              {/* Mensagens */}
              <div className="flex-1 p-2 overflow-y-auto space-y-2">
                {mensagens.map((m, idx) => (
                  <div key={idx}>
                    <div className="text-white/80 text-sm">Você: {m.user}</div>
                    <div className="text-green-400 text-sm">IA: {m.ia}</div>
                  </div>
                ))}
              </div>
              {/* Input */}
              <div className="p-2 flex gap-2 border-t border-gray-700">
                <input
                  type="text"
                  placeholder="Digite sua pergunta..."
                  value={inputMsg}
                  onChange={(e) => setInputMsg(e.target.value)}
                  className="flex-1 p-2 rounded bg-gray-800 text-white border border-gray-700"
                  onKeyDown={(e) => e.key === "Enter" && enviarMensagemIA()}
                />
                <button onClick={enviarMensagemIA} className="bg-red-600 hover:bg-red-900 text-white px-3 rounded">Enviar</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
