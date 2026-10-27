// Nieuwspagina: alle artikelen, nieuwste eerst en groot (docs/coach-logica.md §9a).
const renderAll = () => {
  const all = newsArticles();
  $('#news-all').innerHTML = all.length ? all.map((a, i) => newsCard(a, { lead: i === 0 })).join('') : '<p class="empty">Nog geen nieuws: speel een avond, dan schrijft het zichzelf.</p>';
};
window.rerender = renderAll;
Promise.all([loadData(), PlayerCard.load().catch(() => {})]).then(renderAll).catch(showError);
