import React, { useState } from "react";

type Message = {
  from: "user" | "bot";
  text: string;
};

const ChatBot: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false); // ← estado para o "digitando"

  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage: Message = { from: "user", text: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true); // ← começa a simular digitando

    setTimeout(() => {
      let botReply = "Desculpe, não entendi sua pergunta. 🤔";

      // === 10 IFs de exemplo ===
      if (input.toLowerCase().includes("oi")) {
        botReply = "Olá! Como posso ajudar?";
      } else if (input.toLowerCase().includes("tchau")) {
        botReply = "Até mais! 👋";
      } else if (input.toLowerCase().includes("faturaram") && input.toLowerCase().includes("março?")) {
        botReply = `Claro! Aqui estão as 5 empresas que mais faturaram no mês março:\nCNPJ_08809\nCNPJ_07238\nCNPJ_04734\nCNPJ_02686\nCNPJ_03394`;
      } else if (input.toLowerCase().includes("faturaram") && input.toLowerCase().includes("abril?")) {
        botReply = `Claro! Aqui estão as 5 empresas que mais faturaram no mês abril:\nCNPJ_08809\nCNPJ_07238\nCNPJ_04734\nCNPJ_02686\nCNPJ_03394`;
      } else if (input.toLowerCase().includes("faturaram") && input.toLowerCase().includes("maio?")) {
        botReply = "Claro! Aqui estão as 5 empresas que mais faturaram no mês maio:\nCNPJ_08809\nCNPJ_07238\nCNPJ_04734\nCNPJ_02686\nCNPJ_03394";
      } else if (input.toLowerCase().includes("transações") && input.toLowerCase().includes("março?")) {
        botReply = "O total de transações feitas no mês de março corresponde a 33.387";
      } else if (input.toLowerCase().includes("transações") && input.toLowerCase().includes("abril?")) {
        botReply = "O total de transações feitas no mês de abril corresponde a 33.324";
      } else if (input.toLowerCase().includes("transações") && input.toLowerCase().includes("maio?")) {
        botReply = "O total de transações feitas no mês de maio corresponde a 33.289";
      } else if (input.toLowerCase().includes("CNPJ_04734")) {
        botReply = `Claro! Aqui está a visão da empresa CNPJ_04734\nSetor: Fabricação de papel\nValor Faturado: R$ 199.492.716\nValor Saldo: R$ -5.240.601\nNGC (Nota Gera do Cliente): 4/10`;
      } else if (input.toLowerCase().includes("5")) {
        botReply = `Claro! Aqui está o Top 5 empresas que tiveram mais transações:\nCNPJ_02281\nCNPJ_00091\nCNPJ_01235\nCNPJ_01926\nCNPJ_01395`;
      }

      const botMessage: Message = { from: "bot", text: botReply };
      setMessages((prev) => [...prev, botMessage]);
      setIsTyping(false); // ← termina de digitar
    }, 1000); // ← 1 segundo simulando digitação
  };

  return (
    <div className="flex flex-col w-full max-w-6xl mx-auto border rounded-lg shadow-lg p-4 h-[650px]">
      {/* Área de mensagens */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`p-2 rounded-lg max-w-[70%] whitespace-pre-line ${msg.from === "user"
                ? "bg-red-600 text-white self-end ml-auto"
                : "bg-gray-200 text-black self-start"
              }`}
          >
            {msg.text}
          </div>
        ))}

        {/* Indicador de digitação */}
        {isTyping && (
          <div className="flex justify-center items-center p-1 rounded-lg max-w-[5%] bg-gray-200 text-black self-start">
            •••
          </div>
        )}
      </div>

      {/* Input + botão */}
      <div className="flex mt-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          className="flex-1 border rounded-l-lg p-2"
          placeholder="Digite sua mensagem..."
        />
        <button
          onClick={handleSend}
          style={{ cursor: "pointer" }}
          className="flex ml-2 items-center p-3 bg-gradient-to-br from-red-600/70 to-red-700/80 rounded-xl shadow hover:scale-105 transform transition"
        >
          Enviar
        </button>
      </div>
    </div>
  );
};

export default ChatBot;
