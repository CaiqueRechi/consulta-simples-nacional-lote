// The site appends a TempData cookie chunk on every query; once it grows too
// large the server answers 431 and the frame goes blank. Drop only that cookie.
const HOST = 'consopt.www8.receita.fazenda.gov.br';
const TEMP_DATA_PREFIX = '.AspNetCore.Mvc.CookieTempDataProvider';

async function clearTempData() {
  const cookies = await chrome.cookies.getAll({ domain: HOST });
  const targets = cookies.filter((c) => c.name.startsWith(TEMP_DATA_PREFIX));
  await Promise.all(targets.map((c) => chrome.cookies.remove({
    url: `https://${c.domain.replace(/^\./, '')}${c.path}`,
    name: c.name,
  })));
  return targets.length;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message === 'clearTempData') {
    clearTempData().then(sendResponse, () => sendResponse(0));
    return true;
  }
  return false;
});
