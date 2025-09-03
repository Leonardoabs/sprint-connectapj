export async function getFinanceNews() {
  const apiKey = "3e70ababa44645128b2828478b13d3f2"; 
  const res = await fetch(
    `https://newsapi.org/v2/top-headlines?category=business&language=pt&apiKey=${apiKey}`
  );

  if (!res.ok) {
    console.error("Erro ao buscar notícias:", res.status, res.statusText);
    return [];
  }

  const data = await res.json();
  console.log("Artigos recebidos:", data.articles);
  return data.articles || [];
}
