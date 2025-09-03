"use client";
import { useState } from "react";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(true);

  const tabs = [
    {
      name: "Home",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 12l2-2m0 0l7-7 7 7m-2 2v7a2 2 0 002 2h-4a2 2 0 01-2-2v-5H9v5a2 2 0 01-2 2H3a2 2 0 002-2v-7z"
          />
        </svg>
      ),
    },
    {
      name: "Cliente",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5.121 17.804A12 12 0 0112 15a12 12 0 016.879 2.804M15 11a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      ),
    },
    {
      name: "Redes",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 10h4l3 8 4-16 3 8h4"
          />
        </svg>
      ),
    },
    {
      name: "Tools",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      ),
    },
  ];

  return (
    <>
      {/* Botão para abrir sidebar quando fechada */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed top-4 left-4 p-2 bg-red-700 text-white rounded-full shadow-lg hover:bg-red-800 transition z-50"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-red-700 p-4 flex flex-col transition-transform shadow-xl z-50 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Cabeçalho com logo e título */}
        <div className="flex flex-col mb-8">
          {/* Logo com fundo branco */}
          <h1 className="text-2xl font-bold text-white p-2">ConnectaPJ</h1>
          {/* Botão de fechar no topo direito */}
          <button
            onClick={() => setIsOpen(false)}
            className="absolute top-4 right-4 p-1 rounded hover:bg-red-600 transition"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-white"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        {/* Navegação */}
        <nav className="flex flex-col gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.name}
              onClick={() => setActiveTab(tab.name)}
              className={`flex items-center gap-3 px-4 py-2 rounded-lg w-full transition relative ${
                activeTab === tab.name
                  ? "bg-gray-200 text-red-700 font-semibold shadow-inner"
                  : "text-white hover:bg-red-600 hover:shadow-md"
              }`}
            >
              {/* Barra lateral vermelha para aba ativa */}
              {activeTab === tab.name && (
                <span className="absolute left-0 top-0 h-full w-1 bg-red-800 rounded-r"></span>
              )}
              {tab.icon}
              {tab.name}
            </button>
          ))}
        </nav>

        {/* Rodapé */}
        <div className="mt-auto text-white text-sm opacity-70">
          © 2025 ConnectaPJ
        </div>
      </aside>

      {/* Conteúdo principal ajustável */}
      <main className={`transition-all duration-300 ${isOpen ? "ml-64" : "ml-0"} p-6`}>
        {/* Renderize conteúdo conforme activeTab */}
      </main>
    </>
  );
}
