"use client";
import { useEffect, useState } from "react";
import { FaBitcoin, FaDollarSign, FaEuroSign } from "react-icons/fa";

interface Noticia {
  id: string;
  titulo: string;
  descricao?: string;
  link: string;
  data: string;
  fonte: string;
  imagem?: string | null;
}

interface Cotacao {
  nome: string;
  valor: string;
  variacao: string;
  icone?: JSX.Element;
}

export default function Dashboard() {
  const [noticias, setNoticias] = useState<Noticia[]>([]);
  const [cotacoes, setCotacoes] = useState<Cotacao[]>([]);
  const [carregandoNoticias, setCarregandoNoticias] = useState(true);
  const [carregandoCotacoes, setCarregandoCotacoes] = useState(true);

  // Atualiza ticker a cada 30 segundos
  useEffect(() => {
    async function carregarCotacoes() {
      try {
        const ativos = [
          { simbolo: "USD-BRL", icone: <FaDollarSign /> },
          { simbolo: "EUR-BRL", icone: <FaEuroSign /> },
          { simbolo: "BTC-BRL", icone: <FaBitcoin /> },
        ];

        const resultados = await Promise.all(
          ativos.map(async (ativo) => {
            const resp = await fetch(
              `https://economia.awesomeapi.com.br/json/last/${ativo.simbolo}`
            );
            const data = await resp.json();
            const key = Object.keys(data)[0];
            return {
              nome: data[key].name,
              valor: `R$ ${parseFloat(data[key].bid).toFixed(2)}`,
              variacao: `${parseFloat(data[key].pctChange).toFixed(2)}%`,
              icone: ativo.icone,
            };
          })
        );

        setCotacoes(resultados);
        setCarregandoCotacoes(false);
      } catch (err) {
        console.error("Erro ao carregar cotações:", err);
      }
    }

    carregarCotacoes();
    const interval = setInterval(carregarCotacoes, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    async function carregarNoticias() {
      try {
        const res = await fetch("/api/noticias");
        const data = await res.json();
        setNoticias(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Erro ao carregar notícias:", err);
        setNoticias([]);
      } finally {
        setCarregandoNoticias(false);
      }
    }
    carregarNoticias();
  }, []);

  return (
    <div className="bg-black min-h-screen px-4 md:px-10 py-8 space-y-10">
      <h2 className="text-4xl font-bold text-red-600">Painel Financeiro</h2>

      {/* Ticker de cotações */}
      <div className="overflow-hidden whitespace-nowrap border border-red-600 rounded-xl bg-gray-900 p-3">
        <div
          className="inline-block animate-marquee space-x-12"
          style={{ display: "inline-flex" }}
        >
          {carregandoCotacoes ? (
            <span className="text-gray-400">Carregando cotações...</span>
          ) : (
            cotacoes.map((c) => (
              <div
                key={c.nome}
                className="flex items-center gap-2 text-white font-bold text-lg"
              >
                <span className="text-red-600">{c.icone}</span>
                <span>{c.nome}</span>
                <span>{c.valor}</span>
                <span
                  className={
                    c.variacao.startsWith("+")
                      ? "text-green-500"
                      : "text-red-500"
                  }
                >
                  {c.variacao}
                </span>
                <span className="text-gray-500">|</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Notícias */}
      <h2 className="text-3xl font-bold text-red-600">Notícias Financeiras (Atualizadas) </h2>
      {carregandoNoticias && <p className="text-gray-400">Carregando notícias...</p>}
      {!carregandoNoticias && noticias.length === 0 && (
        <p className="text-gray-400">Nenhuma notícia disponível no momento.</p>
      )}

      <div className="flex flex-col space-y-6">
        {noticias.map((n) => (
          <a
            key={n.id}
            href={n.link}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-gray-900 border border-red-600/30 rounded-2xl shadow-lg overflow-hidden transform transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:border-red-400 flex flex-col md:flex-row gap-4 group"
          >
            {n.imagem && (
              <div className="relative h-48 md:h-auto md:w-1/3 overflow-hidden">
                <img
                  src={n.imagem}
                  alt={n.titulo}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </div>
            )}
            <div className="p-5 flex flex-col justify-between flex-1 gap-3">
              <h3 className="text-red-600 font-bold text-xl line-clamp-2 group-hover:text-red-400 transition-colors">
                {n.titulo}
              </h3>
              {n.descricao && (
                <p className="text-gray-300 text-sm line-clamp-3">{n.descricao}</p>
              )}
              <div className="flex justify-between items-center text-gray-400 text-xs mt-2">
                <span>{n.fonte}</span>
                <span>{new Date(n.data).toLocaleDateString()}</span>
              </div>
            </div>
          </a>
        ))}
      </div>

      <style jsx>{`
        .animate-marquee {
          animation: marquee 25s linear infinite;
        }
        @keyframes marquee {
          0% {
            transform: translateX(100%);
          }
          100% {
            transform: translateX(-100%);
          }
        }
      `}</style>
    </div>
  );
}
