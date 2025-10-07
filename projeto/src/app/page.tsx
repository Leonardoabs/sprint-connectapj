"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/app/components/Sidebar";
import HomeTab from "@/app/components/HomeTab";
import ClienteTab from "@/app/components/ClienteTab";
import RedesTab from "@/app/components/RedesTab";
import NoticiasTab from "@/app/components/NoticiasTab";
import ChatBotTab from "@/app/components/ChatBotTab";
import { getFinanceNews } from "@/app/services/newsService";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("Home");
  const [noticias, setNoticias] = useState<any[]>([]);

  useEffect(() => {
    // Busca notícias ao abrir a página
    getFinanceNews().then((articles) => setNoticias(articles || []));
  }, []);

  return (
    <div className="flex min-h-screen bg-gray-900 text-white">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="flex-1 p-8 overflow-auto">
        {activeTab === "Home" && <HomeTab noticias={noticias} />}
        {activeTab === "Cliente" && <ClienteTab />}
        {activeTab === "Redes" && <RedesTab />}
        {activeTab === "Notícias" && <NoticiasTab />}
        {activeTab === "Chat" && <ChatBotTab />}
      </main>
    </div>
  );
}
