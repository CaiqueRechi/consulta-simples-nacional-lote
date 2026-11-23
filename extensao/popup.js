const PAGE_URL = 'https://www8.receita.fazenda.gov.br/SimplesNacional/aplicacoes.aspx?id=21';
const COLUMNS = ['cnpj', 'nome', 'simples', 'simei', 'ibs', 'cbs', 'consultadoEm', 'status'];
const $ = (id) => document.getElementById(id);

const getState = () => chrome.storage.local.get({ queue: [], index: 0, results: [], running: false });

async function render() {
  const { queue, index, results, running } = await getState();
  const errors = results.filter((r) => r.status !== 'OK').length;
  $('status').textContent = queue.length
    ? `${index} de ${queue.length} consultados (${errors} com erro). ${running ? 'Em andamento.' : 'Pausado.'}`
    : 'Nenhuma lista carregada.';
}

$('file').addEventListener('change', async (event) => {
  const text = await event.target.files[0].text();
  const cnpjs = text.split(/\r?\n/).map((l) => l.replace(/\D/g, '')).filter(Boolean).map((c) => c.padStart(14, '0'));
  const { results } = await getState();
  const done = new Set(results.filter((r) => r.status === 'OK').map((r) => r.cnpj));
  const queue = [...new Set(cnpjs)].filter((c) => !done.has(c));
  await chrome.storage.local.set({ queue, index: 0, running: false });
  render();
});

$('start').addEventListener('click', async () => {
  const { queue, index } = await getState();
  if (index >= queue.length) return;
  await chrome.storage.local.set({ running: true });
  chrome.tabs.create({ url: PAGE_URL });
  render();
});

$('pause').addEventListener('click', async () => {
  await chrome.storage.local.set({ running: false });
  render();
});

$('export').addEventListener('click', async () => {
  const { results } = await getState();
  const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [COLUMNS.join(';'), ...results.map((r) => COLUMNS.map((c) => escape(r[c])).join(';'))];
  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `simples_nacional_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
});

$('clear').addEventListener('click', async () => {
  if (!confirm('Apagar a lista e todos os resultados guardados?')) return;
  await chrome.storage.local.clear();
  render();
});

render();
