from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
import openai
from dotenv import load_dotenv
import os

# Carregar variáveis de ambiente
load_dotenv()
openai.api_key = os.getenv("OPENAI_API_KEY")

app = FastAPI(title="Chatbot de Insights")

# Configuração do CORS
origins = ["http://localhost:3000"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Carregar bases de dados
base_id = pd.read_excel(
    "../public/Challenge FIAP - Bases.xlsx",
    sheet_name="Base 1 - ID",
    engine="openpyxl"
)
base_transacoes = pd.read_excel(
    "../public/Challenge FIAP - Bases.xlsx",
    sheet_name="Base 2 - Transações",
    engine="openpyxl"
)

# Modelo de entrada
class CNPJRequest(BaseModel):
    cnpj: str

@app.post("/insights")
async def gerar_insights(request: CNPJRequest):
    cnpj_empresa = request.cnpj.strip()
    if not cnpj_empresa.startswith("CNPJ_"):
        cnpj_empresa = f"CNPJ_{cnpj_empresa}"

    # Filtra transações da empresa
    transacoes_empresa = base_transacoes[
        (base_transacoes["ID_RCBE"] == cnpj_empresa) |
        (base_transacoes["ID_PGTO"] == cnpj_empresa)
    ]

    info_empresa = base_id[base_id["ID"] == cnpj_empresa]

    if info_empresa.empty:
        return {"error": "CNPJ não encontrado na base de empresas."}
    if transacoes_empresa.empty:
        return {"error": "CNPJ não encontrado nas transações."}

    # Prompt ajustado
    prompt = f"""
Você é um analista senior de dados experiente.

Objetivo: Gerar insights claros sobre a empresa de CNPJ {cnpj_empresa}, focando em:
- Padrões e tendências de fluxo de caixa
- Saldos por mês
- Transações financeiras

Instruções para resposta:
- Retorne no máximo 3 insights principais.
- Cada insight deve estar em um **bloco separado**.
- Cada bullet point deve estar em uma **nova linha**.
- Nunca coloque dois bullet points na mesma linha.
- Use este formato exatamente:

Insight Principal:
(bullet points descrevendo a descoberta)

Evidência nos Dados:
(bullet points mostrando padrões ou anomalias)

Implicação de Negócio:
(bullet points explicando riscos e oportunidades sob o impacto financeiro)

- Seja conciso e objetivo (no máximo 1 bullet points por seção).
- Não repita informações.
- Separe cada insight com uma linha em branco.

Dados de contexto da empresa:

Informações gerais:
{info_empresa.to_string(index=False)}

Transações recentes (últimas 50):
{transacoes_empresa.tail(50).to_string(index=False)}
"""

    try:
        response = openai.ChatCompletion.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "Você é um analista de dados experiente."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=700,
            temperature=0.6
        )
        insights = response["choices"][0]["message"]["content"]
        return {"insights": insights}
    except Exception as e:
        return {"error": f"Erro ao gerar insights: {str(e)}"}