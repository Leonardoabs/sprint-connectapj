"use client";

import { useState } from "react";
import Sidebar from "@/app/components/Sidebar";
import HomeTab from "@/app/components/HomeTab";
import ClienteTab from "@/app/components/ClienteTab";
import RedesTab from "@/app/components/RedesTab";
import NoticiasTab from "@/app/components/NoticiasTab";
import ChatBotTab from "@/app/components/ChatBotTab";

export default function LoginDashboard() {
  const [logado, setLogado] = useState(false);
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState(false);
  const [animShake, setAnimShake] = useState(false);
  const [activeTab, setActiveTab] = useState("Home");
  const [noticias, setNoticias] = useState<any[]>([]);

  const entrar = () => {
    if (usuario === "santander" && senha === "1234") {
      setLogado(true);
      setErro(false);
    } else {
      setErro(true);
      setAnimShake(true);
      setTimeout(() => setAnimShake(false), 500);
    }
  };

  if (!logado) {
    // Tela de login
    return (
      <div className="flex flex-col md:flex-row min-h-screen">
        {/* Lado esquerdo com imagem e overlay */}
        <div
          className="hidden md:flex flex-1 bg-cover bg-center relative"
          style={{ backgroundImage: 'url("/login.png")' }}
        >
          <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center">
          </div>
        </div>

        {/* Lado direito com form */}
        <div className="flex flex-1 items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 px-6">
          <div className="max-w-md w-full text-center">
            <h1 className="text-6xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-[#ec0000] to-[#ff4d4d] mb-6 animate-gradient">
              ConnectaPJ
            </h1>
            <div
              className={`bg-gray-800/80 backdrop-blur-md p-10 rounded-3xl shadow-2xl flex flex-col gap-5 transition-transform ${
                animShake ? "animate-shake" : ""
              }`}
            >
              <input
                type="text"
                placeholder="Usuário"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                className="p-4 rounded-xl bg-gray-700 text-white outline-none focus:ring-2 focus:ring-[#ec0000] focus:shadow-neon transition duration-300"
              />
              <input
                type="password"
                placeholder="Senha"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="p-4 rounded-xl bg-gray-700 text-white outline-none focus:ring-2 focus:ring-[#ec0000] focus:shadow-neon transition duration-300"
              />
              {erro && (
                <p className="text-red-500 font-semibold text-sm text-center">
                  Usuário ou senha incorretos
                </p>
              )}
              <button
                onClick={entrar}
                className="mt-3 bg-[#ec0000] hover:bg-[#ff1a1a] active:scale-95 px-6 py-3 rounded-xl font-bold text-white shadow-lg transform transition-all duration-200 hover:shadow-[0_0_20px_#ec0000]"
              >
                Entrar
              </button>
            </div>
          </div>
        </div>

        {/* Estilos extras */}
        <style jsx>{`
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-8px); }
            50% { transform: translateX(8px); }
            75% { transform: translateX(-8px); }
          }
          .animate-shake { animation: shake 0.5s; }

          @keyframes gradient {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
          .animate-gradient {
            background-size: 200% 200%;
            animation: gradient 4s ease infinite;
          }

        `}</style>
      </div>
    );
  }

  // Dashboard após login
  return (
    <div className="flex min-h-screen bg-gray-900 text-white">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="flex-1 p-8 overflow-auto">
        {activeTab === "Home" && <HomeTab/>}
        {activeTab === "Cliente" && <ClienteTab />}
        {activeTab === "Redes" && <RedesTab />}
        {activeTab === "Notícias" && <NoticiasTab />}
        {activeTab === "Assistente virtual" && <ChatBotTab />}
      </main>
    </div>
  );
}
