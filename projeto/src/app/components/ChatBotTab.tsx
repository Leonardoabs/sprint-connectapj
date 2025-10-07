"use client";

import React, { useState, useRef, useEffect } from "react";
import { sendMessageToBot } from "../services/chatService";

// Função para extrair o primeiro insight e limpar separadores
function getFirstInsight(text: string) {
  const blocks = text.split(/Insight Principal:/).filter(Boolean);
  if (blocks.length === 0) return null;

  const block = blocks[0];
  const insightMatch = block.match(/^(.*?)(Evidência nos Dados:)/s);
  const evidenciaMatch = block.match(/Evidência nos Dados:(.*?)(Implicação de Negócio:)/s);
  const implicacaoMatch = block.match(/Implicação de Negócio:(.*)/s);

  // Função para limpar --- e espaços extras
  const cleanText = (str?: string) =>
    str
      ? str
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line && line !== "---")
          .join("\n")
      : "";

  return {
    insight: cleanText(insightMatch ? insightMatch[1] : ""),
    evidencia: cleanText(evidenciaMatch ? evidenciaMatch[1] : ""),
    implicacao: cleanText(implicacaoMatch ? implicacaoMatch[1] : ""),
  };
}

type Message = {
  from: "user" | "bot";
  text: string;
};

const ChatBotTab: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = { from: "user", text: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    const reply = await sendMessageToBot(input);
    const botMessage: Message = { from: "bot", text: reply };
    setMessages((prev) => [...prev, botMessage]);
    setIsTyping(false);
  };

  const botImage =
    "https://png.pngtree.com/png-vector/20250529/ourmid/pngtree-3d-cartoon-woman-with-glasses-and-a-red-shirt-png-image_16406538.png";
  const userImage =
    "https://static.vecteezy.com/system/resources/previews/028/238/588/non_2x/old-man-teacher-face-3d-profession-avatars-free-png.png";

  return (
    <div className="flex flex-col w-full max-w-3xl mx-auto border rounded-2xl shadow-xl p-4 h-[750px] bg-white">
      {/* Área de mensagens */}
      <div className="flex-1 overflow-y-auto p-2 space-y-4">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex items-start gap-2 ${msg.from === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.from === "bot" && (
              <img src={botImage} alt="Bot" className="w-10 h-10 rounded-full object-cover shadow" />
            )}

            <div className="relative p-3 rounded-2xl max-w-[70%] break-words">
              {msg.from === "user" ? (
                <div className="bg-red-600 text-white rounded-br-none p-3 shadow-md">{msg.text}</div>
              ) : (
                (() => {
                  const item = getFirstInsight(msg.text);
                  if (!item) return <div className="text-sm">Nenhum insight disponível</div>;

                  return (
                    <div className="bg-[#f0f0f0] text-black p-5 rounded-2xl shadow-md space-y-3">
                      <p className="font-bold text-lg">💡 Insight Principal</p>
                      <ul className="list-disc list-inside text-sm">
                        {item.insight.split(/[\.\n]/).map((p, i) => p.trim() && <li key={i}>{p.trim()}</li>)}
                      </ul>

                      <p className="font-semibold">📊 Evidência nos Dados</p>
                      <ul className="list-disc list-inside text-sm">
                        {item.evidencia.split(/[\.\n]/).map((p, i) => p.trim() && <li key={i}>{p.trim()}</li>)}
                      </ul>

                      <p className="font-semibold">⚠️ Implicação de Negócio</p>
                      <ul className="list-disc list-inside text-sm">
                        {item.implicacao.split(/[\.\n]/).map((p, i) => p.trim() && <li key={i}>{p.trim()}</li>)}
                      </ul>
                    </div>
                  );
                })()
              )}
            </div>

            {msg.from === "user" && (
              <img src={userImage} alt="Usuário" className="w-10 h-10 rounded-full object-cover shadow" />
            )}
          </div>
        ))}

        {isTyping && (
          <div className="flex items-center gap-2">
            <img
              src={botImage}
              alt="Bot"
              className="w-10 h-10 rounded-full object-cover shadow animate-pulse"
            />
            <div className="bg-red-500 p-2 rounded-2xl max-w-[30%] animate-pulse">📊 🔍 Gerando insights...</div>
          </div>
        )}

        <div ref={messagesEndRef}></div>
      </div>

      {/* Input + Botão */}
      <div className="flex mt-4 gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Digite o CNPJ da empresa..."
          className="flex-1 p-3 rounded-2xl border-2 border-red-600 bg-white text-black placeholder-black focus:outline-none transition"
        />
        <button
          onClick={handleSend}
          className="bg-gradient-to-br from-red-600 to-red-700 text-white px-6 py-3 rounded-2xl shadow-lg hover:scale-105 transition-transform"
        >
          Enviar
        </button>
      </div>
    </div>
  );
};

export default ChatBotTab;