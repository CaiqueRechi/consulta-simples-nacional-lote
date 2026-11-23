// Runs inside the consultation frame. Fills the next CNPJ of the queue and,
// after the user clicks Consultar, reads the result and moves on.
const FORM_URL = 'https://consopt.www8.receita.fazenda.gov.br/consultaoptantes';
const FIELDS = {
  simples: /Situação no Simples Nacional:\s*(.+)/,
  simei: /Situação no SIMEI:\s*(.+)/,
  ibs: /Situação no Regime Regular do IBS:\s*(.+)/,
  cbs: /Situação no Regime Regular da CBS:\s*(.+)/,
  nome: /Nome Empresarial:\s*(.+)/,
};
const ERROR_SELECTOR = '.validation-summary-errors, .field-validation-error, .alert-danger, .alert-warning';

const getState = () => chrome.storage.local.get({ queue: [], index: 0, results: [], running: false });

function showBanner(text, color) {
  let banner = document.getElementById('csn-banner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'csn-banner';
    banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;padding:8px 12px;'
      + 'font:bold 14px Arial;color:#fff;text-align:center';
    document.body.prepend(banner);
  }
  banner.style.background = color;
  banner.textContent = text;
}

function visibleErrors() {
  const texts = [...document.querySelectorAll(ERROR_SELECTOR)]
    .filter((el) => el.offsetParent !== null)
    .map((el) => el.innerText.replace(/×/g, '').trim())
    .filter(Boolean);
  return [...new Set(texts)];
}

function extract(text) {
  const data = {};
  for (const [key, pattern] of Object.entries(FIELDS)) {
    const match = text.match(pattern);
    data[key] = match ? match[1].trim() : '';
  }
  return data;
}

async function saveResult(state, data) {
  const cnpj = state.queue[state.index];
  const results = state.results.filter((r) => r.cnpj !== cnpj);
  results.push({ cnpj, ...data, consultadoEm: new Date().toLocaleString('pt-BR') });
  const index = state.index + 1;
  await chrome.storage.local.set({ results, index, running: index < state.queue.length });
  return { ...state, results, index };
}

function fillForm(state) {
  const input = document.querySelector("input[name='Cnpj']");
  const button = [...document.querySelectorAll('button')].find((b) => b.innerText.includes('Consultar'));
  if (!input || !button) return;

  input.value = state.queue[state.index];
  input.dispatchEvent(new Event('input', { bubbles: true }));
  // Ask every ancestor page to focus its frame, then focus the button here.
  for (let w = window; w !== w.parent; w = w.parent) w.parent.postMessage('csn-focus', '*');
  window.focus();
  button.focus();
  setTimeout(() => button.focus(), 300);
  showBanner(`${state.index + 1} de ${state.queue.length}: CNPJ ${input.value} preenchido. Clique em Consultar (ou Enter).`, '#2e7d32');
}

const clearTempData = () => chrome.runtime.sendMessage('clearTempData').catch(() => 0);

// A blank document here is the 431 answer for oversized cookies.
async function recoverFromBlankPage() {
  const attempts = Number(sessionStorage.getItem('csn-retries') || 0);
  if (attempts >= 3) {
    showBanner('A página da Receita veio em branco 3 vezes seguidas. Aguarde um pouco e aperte F5.', '#c62828');
    return;
  }
  sessionStorage.setItem('csn-retries', attempts + 1);
  await clearTempData();
  setTimeout(() => location.assign(FORM_URL), 1500 * (attempts + 1));
}

async function run() {
  let state = await getState();
  if (!state.running || state.index >= state.queue.length) return;

  const text = document.body?.innerText.trim() ?? '';
  if (!text && !document.querySelector("input[name='Cnpj']")) {
    await recoverFromBlankPage();
    return;
  }
  sessionStorage.removeItem('csn-retries');

  if (text.includes('Situação no Simples Nacional')) {
    state = await saveResult(state, { ...extract(text), status: 'OK' });
    showBanner(`Gravado (${state.index} de ${state.queue.length}). Indo para o próximo...`, '#1565c0');
    if (state.index < state.queue.length) {
      await clearTempData();
      setTimeout(() => location.assign(FORM_URL), 800);
    }
    else showBanner(`Concluído: ${state.queue.length} CNPJs. Exporte pelo ícone da extensão.`, '#1565c0');
    return;
  }

  const errors = visibleErrors();
  if (errors.some((e) => /captcha/i.test(e))) {
    showBanner('A Receita recusou o captcha. Clique em Consultar de novo.', '#c62828');
    fillForm(state);
    setTimeout(() => showBanner(`${state.index + 1} de ${state.queue.length}: clique em Consultar de novo.`, '#c62828'), 50);
    return;
  }
  if (errors.length) {
    state = await saveResult(state, { status: 'Erro: ' + errors.join(' | ') });
    if (state.index >= state.queue.length) return;
  }
  fillForm(state);
}

chrome.storage.onChanged.addListener((changes) => {
  if (changes.running?.newValue === true && !changes.running.oldValue) run();
});

run();
