# Consulta Simples Nacional em lote

Extensão do Chrome que consulta uma lista de CNPJs na
[consulta de optantes do Simples Nacional](https://www8.receita.fazenda.gov.br/SimplesNacional/aplicacoes.aspx?id=21)
da Receita Federal e guarda, de cada um:

- Nome Empresarial
- Situação no Simples Nacional
- Situação no SIMEI
- Situação no Regime Regular do IBS
- Situação no Regime Regular da CBS

No fim, um script Python transforma o resultado numa planilha Excel.

É **100% gratuito** e **semiautomático**: a extensão preenche cada CNPJ, lê o
resultado, grava e já prepara o próximo. A única coisa que fica com você é
apertar **Enter** (ou clicar em Consultar) a cada CNPJ.

## Resultado num caso real

Lista de **863 CNPJs**, consultada de uma vez em 23/11/2026. Os tempos da
extensão foram medidos pelo horário que ela grava em cada consulta; o tempo
manual é uma estimativa.

| | Extensão (medido) | Manual (estimado) |
| --- | --- | --- |
| Tempo por CNPJ | ~5 s (mediana) | ~50 s (40 a 60 s) |
| Tempo total para 863 CNPJs | **77 min** | **~12 h** (9,6 a 14,4 h) |
| Consultas por minuto | ~11 no total, ~12 no ritmo contínuo | ~1,2 |
| Consultas com erro | 0 | — |

**Redução de tempo: ~89%** (de 87% a 91%, conforme o tempo manual
considerado), ou seja, cerca de **9 vezes mais rápido**.

Como os números foram obtidos:

- **Extensão:** primeira consulta às 10:08:46 e última às 11:25:42. O intervalo
  mediano entre duas consultas foi de 5 segundos. Houve 4 pausas de mais de um
  minuto, somando 7 minutos, enquanto a própria extensão era corrigida durante
  o uso. Elas estão incluídas nos 77 minutos.
- **Manual (estimativa):** por CNPJ, copiar da lista e tirar a pontuação (~5 s),
  voltar à página, limpar o campo, colar e consultar (~8 s), esperar o
  resultado e às vezes o desafio do captcha (~5 s), e copiar os cinco campos
  para a planilha trocando de janela (~30 s). Isso dá uns 50 segundos, sem
  contar pausas e erros de digitação.

## Por que não é 100% automático

A consulta da Receita é protegida por **hCaptcha**. A primeira tentativa,
com um navegador controlado por script (Playwright), foi recusada pela
própria Receita ("Impedido por proteção Captcha. Erro na validação do
Token"), sem nem mostrar o desafio.

Este projeto **não burla o captcha**. A extensão roda no seu Chrome normal,
e quem aperta Consultar é você, como numa consulta manual. Se o hCaptcha
pedir um desafio, você resolve. Todo o resto (digitar, ler, copiar, passar
para o próximo e montar a planilha) fica com a extensão.

## Instalação

Precisa de **Google Chrome** (ou outro navegador baseado em Chromium, como o
Edge) e, para gerar o Excel, de **Python 3.9 ou mais novo**.

1. Baixe este repositório: botão **Code → Download ZIP** no GitHub, e
   extraia, ou `git clone`.
2. No Chrome, abra `chrome://extensions`.
3. Ative o **Modo do desenvolvedor**, no canto superior direito.
4. Clique em **Carregar sem compactação** e escolha a pasta `extensao` deste
   repositório. A janela só mostra pastas, então ela parece vazia; é só
   entrar em `extensao` e clicar em **Selecionar pasta**.
5. Fixe o ícone **Consulta Simples Nacional em lote** na barra do Chrome.
6. Instale a dependência do conversor para Excel:

   ```
   python -m pip install -r requirements.txt
   ```

## Como usar

1. Monte um arquivo `.txt` com **um CNPJ por linha**. Pode ser com ou sem
   pontuação, e o zero à esquerda pode faltar (`1234567000100` vira
   `01234567000100`). CNPJs repetidos são ignorados.
2. Clique no ícone da extensão, escolha o arquivo e clique em
   **Iniciar / continuar**. Ela abre a página da consulta.
3. Uma faixa verde mostra `N de TOTAL: CNPJ ... preenchido`. Aperte **Enter**.
   O foco já fica no botão Consultar.
4. A extensão grava o resultado, volta ao formulário e preenche o próximo
   CNPJ. Repita o Enter até o fim.
5. Clique no ícone e em **Exportar resultados (.csv)**. O arquivo vai para
   Downloads.
6. Dê dois cliques em `gerar_planilha.bat` (ou rode
   `python gerar_planilha.py`). Ele pega o `simples_nacional_*.csv` mais
   recente de Downloads e gera `resultado_simples_nacional.xlsx` na pasta do
   projeto. Também aceita caminhos:
   `python gerar_planilha.py entrada.csv saida.xlsx`.

### Pausar e continuar

O progresso fica guardado na extensão, não nos cookies do site. Dá para
fechar o Chrome, limpar cookies ou cache e continuar depois: abra a página
e aperte F5, ou clique em **Iniciar / continuar**. Ao carregar a mesma lista
de novo, os CNPJs que já deram certo não entram na fila.

Para atualizar a extensão, use o botão **Recarregar** (seta circular) em
`chrome://extensions`. **Não remova** a extensão: remover apaga os
resultados guardados. Na dúvida, exporte o CSV antes.

## Problemas conhecidos e como a extensão lida com eles

| Sintoma | Causa | O que acontece |
| --- | --- | --- |
| Quadro da consulta em branco depois de várias consultas | A cada consulta o site aumenta o cookie `.AspNetCore.Mvc.CookieTempDataProvider`. Quando ele fica grande demais, o servidor responde **431 Request Header Fields Too Large** com o corpo vazio | A extensão apaga só esse cookie a cada consulta. Se a página vier em branco mesmo assim, limpa e recarrega sozinha, até 3 vezes |
| Faixa vermelha "A Receita recusou o captcha" | O hCaptcha não validou a consulta | O CNPJ é preenchido de novo; aperte Enter outra vez |
| Enter não faz nada | O foco do teclado saiu do formulário (por exemplo, depois de um clique fora dele) | Clique uma vez no formulário ou espere o próximo CNPJ, que devolve o foco ao botão |

## Estrutura

```
extensao/
  manifest.json     extensão Chrome (Manifest V3)
  content.js        roda no formulário: preenche, lê o resultado, grava, avança
  focus-frame.js    roda na página de fora: põe o foco do teclado no formulário
  background.js     apaga o cookie TempData que causa o erro 431
  popup.html/.js    carregar a lista, iniciar, pausar, exportar, limpar
gerar_planilha.py   CSV exportado -> Excel formatado
gerar_planilha.bat  atalho de dois cliques para o conversor
```

A extensão só tem acesso a `consopt.www8.receita.fazenda.gov.br` e às
páginas do Simples Nacional em `www8.receita.fazenda.gov.br`. Ela não envia
dados para lugar nenhum: os resultados ficam no armazenamento local do
Chrome até você exportar.

## Aviso

Projeto independente, sem vínculo com a Receita Federal. A página da
consulta pode mudar a qualquer momento e quebrar a leitura dos campos. Os
dados são públicos, mas use com moderação: é uma consulta por vez, no ritmo
de uma pessoa.

## Licença

[MIT](LICENSE)
