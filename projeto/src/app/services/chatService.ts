export async function sendMessageToBot(cnpj: string) {
  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cnpj }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.reply || res.statusText);
    }

    const data = await res.json();
    return data.insights || data.reply;
  } catch (error: any) {
    console.error("Erro na API do chatbot:", error.message);
    return `Erro ao se comunicar com o chatbot: ${error.message}`;
  }
}
