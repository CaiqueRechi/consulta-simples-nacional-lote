"""Converte o CSV exportado pela extensão em planilha Excel.

Uso:  python gerar_planilha.py [arquivo.csv] [resultado.xlsx]
Sem argumentos, pega o simples_nacional_*.csv mais recente de Downloads.
"""

import csv
import sys
from pathlib import Path

from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill

BASE_DIR = Path(__file__).resolve().parent
COLUMNS = [
    ("cnpj", "CNPJ", 20),
    ("nome", "Nome Empresarial", 45),
    ("simples", "Simples Nacional", 40),
    ("simei", "SIMEI", 28),
    ("ibs", "Regime Regular IBS", 22),
    ("cbs", "Regime Regular CBS", 22),
    ("consultadoEm", "Consultado em", 20),
    ("status", "Status", 30),
]


def formatCnpj(cnpj):
    cnpj = cnpj.zfill(14)
    return f"{cnpj[:2]}.{cnpj[2:5]}.{cnpj[5:8]}/{cnpj[8:12]}-{cnpj[12:]}"


def latestExport():
    files = sorted((Path.home() / "Downloads").glob("simples_nacional_*.csv"), key=lambda p: p.stat().st_mtime)
    if not files:
        sys.exit("Nenhum simples_nacional_*.csv encontrado em Downloads. Exporte pela extensão primeiro.")
    return files[-1]


def main():
    source = Path(sys.argv[1]) if len(sys.argv) > 1 else latestExport()
    target = Path(sys.argv[2]) if len(sys.argv) > 2 else BASE_DIR / "resultado_simples_nacional.xlsx"

    with source.open(encoding="utf-8-sig", newline="") as handle:
        rows = list(csv.DictReader(handle, delimiter=";"))

    workbook = Workbook()
    sheet = workbook.active
    sheet.title = "Simples Nacional"
    sheet.append([title for _, title, _ in COLUMNS])
    for cell in sheet[1]:
        cell.font = Font(bold=True, color="FFFFFF")
        cell.fill = PatternFill("solid", fgColor="2E7D32")
    for index, (_, _, width) in enumerate(COLUMNS):
        sheet.column_dimensions[chr(ord("A") + index)].width = width

    for row in rows:
        row["cnpj"] = formatCnpj(row["cnpj"])
        sheet.append([row.get(key, "") for key, _, _ in COLUMNS])

    sheet.freeze_panes = "A2"
    sheet.auto_filter.ref = sheet.dimensions
    workbook.save(target)
    print(f"{len(rows)} linhas de {source.name} gravadas em {target}")


if __name__ == "__main__":
    main()
