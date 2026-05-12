import ExcelJS from 'exceljs';
import { fetchEmpresaBranding } from './empresaBranding';

// ─── Meta ─────────────────────────────────────────────────────────────────────

export interface ExportMeta {
  companyName?: string;
  logoUrl?: string | null;
  cnpj?: string | null;
  responsavelTecnico?: string | null;
}

export async function loadExportMeta(companyId: string): Promise<ExportMeta> {
  if (!companyId) return {};
  const b = await fetchEmpresaBranding(companyId);
  if (!b) return {};
  return {
    companyName: b.name || undefined,
    logoUrl: b.logoUrl,
    cnpj: b.cnpj,
    responsavelTecnico: b.responsavelTecnico,
  };
}

// ─── Styling constants ─────────────────────────────────────────────────────────

const NAVY: ExcelJS.Fill        = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F2942' } };
const BLUE: ExcelJS.Fill        = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
const BLUE_MID: ExcelJS.Fill    = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2D6A9F' } };
const BLUE_LIGHT: ExcelJS.Fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0EAF4' } };
const ALT: ExcelJS.Fill         = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F4F8' } };

const BORDER_THIN: Partial<ExcelJS.Border> = { style: 'thin', color: { argb: 'FFCCCCCC' } };
const BORDERS: ExcelJS.Borders = {
  top: BORDER_THIN, left: BORDER_THIN, bottom: BORDER_THIN, right: BORDER_THIN,
  diagonal: {},
};

function styleHeader(row: ExcelJS.Row) {
  row.eachCell((c) => {
    c.fill = BLUE; c.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    c.border = BORDERS; c.alignment = { horizontal: 'center', vertical: 'middle' };
  });
  row.height = 22;
}

function styleData(row: ExcelJS.Row, alt: boolean) {
  row.eachCell({ includeEmpty: true }, (c) => {
    if (alt) c.fill = ALT;
    c.border = BORDERS;
    c.alignment = { vertical: 'middle' };
  });
  row.height = 18;
}

function styleSection(row: ExcelJS.Row, colCount: number) {
  const ws = row.worksheet;
  ws.mergeCells(`A${row.number}:${colLetter(colCount)}${row.number}`);
  row.eachCell((c) => {
    c.fill = BLUE_MID; c.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
    c.border = BORDERS; c.alignment = { horizontal: 'left', vertical: 'middle' };
  });
  row.height = 20;
}

function colLetter(n: number): string {
  let s = '';
  while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); }
  return s;
}

// ─── Logo fetch ────────────────────────────────────────────────────────────────

async function fetchImageBuffer(url: string): Promise<{ buffer: ArrayBuffer; extension: 'png' | 'jpeg' | 'gif' } | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const ct = res.headers.get('content-type') || '';
    const extension: 'png' | 'jpeg' | 'gif' = ct.includes('png') ? 'png' : ct.includes('gif') ? 'gif' : 'jpeg';
    return { buffer: await res.arrayBuffer(), extension };
  } catch { return null; }
}

// ─── Sheet setup helpers ───────────────────────────────────────────────────────

async function addSheetHeader(
  wb: ExcelJS.Workbook,
  ws: ExcelJS.Worksheet,
  title: string,
  colCount: number,
  meta?: ExportMeta,
): Promise<number> {
  const last = colLetter(colCount);

  // Logo image (overlay — reserve 3 rows)
  if (meta?.logoUrl) {
    const img = await fetchImageBuffer(meta.logoUrl);
    if (img) {
      const id = wb.addImage({ buffer: img.buffer, extension: img.extension });
      const r1 = ws.addRow([]); r1.height = 20;
      const r2 = ws.addRow([]); r2.height = 20;
      const r3 = ws.addRow([]); r3.height = 20;
      ws.addImage(id, { tl: { col: 0, row: 0 }, ext: { width: 155, height: 55 } });
      // company name alongside logo (col 2+)
      if (meta.companyName) {
        r1.getCell(3).value = meta.companyName;
        r1.getCell(3).font = { bold: true, size: 14, color: { argb: 'FF0F2942' } };
      }
      if (meta.cnpj) {
        r2.getCell(3).value = `CNPJ: ${meta.cnpj}`;
        r2.getCell(3).font = { size: 9, color: { argb: 'FF64748B' } };
      }
      if (meta.responsavelTecnico) {
        r3.getCell(3).value = `RT: ${meta.responsavelTecnico}`;
        r3.getCell(3).font = { italic: true, size: 9, color: { argb: 'FF64748B' } };
      }
    }
  }

  // Title bar
  const titleRow = ws.addRow([title]);
  ws.mergeCells(`A${titleRow.number}:${last}${titleRow.number}`);
  titleRow.eachCell((c) => {
    c.fill = NAVY; c.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 13 };
    c.alignment = { horizontal: 'center', vertical: 'middle' };
  });
  titleRow.height = 28;

  // Generated date (right-aligned)
  const dateRow = ws.addRow([`Gerado em: ${new Date().toLocaleString('pt-BR')}`]);
  ws.mergeCells(`A${dateRow.number}:${last}${dateRow.number}`);
  dateRow.getCell(1).font = { italic: true, size: 8, color: { argb: 'FF94A3B8' } };
  dateRow.getCell(1).alignment = { horizontal: 'right' };
  dateRow.height = 12;

  ws.addRow([]); // spacer
  return ws.lastRow!.number + 1;
}

function addAutoFilter(ws: ExcelJS.Worksheet, headerRow: number, colCount: number) {
  ws.autoFilter = { from: { row: headerRow, column: 1 }, to: { row: headerRow, column: colCount } };
}

function addPrintSetup(ws: ExcelJS.Worksheet, freezeAt: number) {
  ws.pageSetup = {
    orientation: 'landscape',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: { left: 0.5, right: 0.5, top: 0.75, bottom: 0.75, header: 0.3, footer: 0.3 },
    printTitlesRow: `${freezeAt}:${freezeAt}`,
  };
  ws.headerFooter = { oddFooter: '&L&"Calibri"&8ObraApp&C&P / &N&R&8&D' };
  ws.views = [{ state: 'frozen', ySplit: freezeAt }];
}

async function downloadBlob(wb: ExcelJS.Workbook, filename: string) {
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ─── MEDIÇÕES ──────────────────────────────────────────────────────────────────

export interface MedicaoRow {
  disciplina: string;
  contratante: string;
  descricao: string;
  quantidade: number;
  unidade: string;
  valorUnitario: number;
  valorTotal: number;
}

export async function exportMedicoes(rows: MedicaoRow[], filename: string, meta?: ExportMeta) {
  const wb = new ExcelJS.Workbook(); wb.creator = 'ObraApp';
  const ws = wb.addWorksheet('Medições');

  ws.columns = [
    { key: 'disciplina',    width: 22 },
    { key: 'contratante',   width: 22 },
    { key: 'descricao',     width: 36 },
    { key: 'quantidade',    width: 12 },
    { key: 'unidade',       width: 10 },
    { key: 'valorUnitario', width: 18 },
    { key: 'valorTotal',    width: 18 },
  ];

  await addSheetHeader(wb, ws, 'Relatório de Medições', 7, meta);

  const headerRow = ws.addRow(['Disciplina', 'Contratante', 'Descrição', 'Qtd', 'Unidade', 'Valor Unitário (R$)', 'Valor Total (R$)']);
  styleHeader(headerRow);
  addAutoFilter(ws, headerRow.number, 7);

  let total = 0;
  rows.forEach((m, i) => {
    const r = ws.addRow([m.disciplina, m.contratante, m.descricao, m.quantidade, m.unidade, m.valorUnitario, m.valorTotal]);
    r.getCell(6).numFmt = '#,##0.00'; r.getCell(7).numFmt = '#,##0.00';
    r.getCell(7).font = { bold: true, color: { argb: 'FF16A34A' } };
    styleData(r, i % 2 === 1);
    total += m.valorTotal;
  });

  const totalRow = ws.addRow(['', '', '', '', 'TOTAL GERAL', '', total]);
  totalRow.eachCell((c) => {
    c.fill = NAVY; c.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    c.border = BORDERS; c.alignment = { vertical: 'middle' };
  });
  totalRow.getCell(7).numFmt = '#,##0.00';
  totalRow.height = 22;

  addPrintSetup(ws, headerRow.number);
  await downloadBlob(wb, filename);
}

// ─── ANDAMENTO POR ANDAR ───────────────────────────────────────────────────────

export interface AndamentoRow {
  pavimento: string;
  tipo: string;
  disciplina: string;
  status: string;
  progresso: string;
}

export async function exportAndamento(rows: AndamentoRow[], filename: string, meta?: ExportMeta) {
  const wb = new ExcelJS.Workbook(); wb.creator = 'ObraApp';
  const ws = wb.addWorksheet('Andamento por Andar');

  ws.columns = [
    { key: 'pavimento',  width: 18 },
    { key: 'tipo',       width: 16 },
    { key: 'disciplina', width: 22 },
    { key: 'status',     width: 22 },
    { key: 'progresso',  width: 14 },
  ];

  await addSheetHeader(wb, ws, 'Andamento por Andar', 5, meta);

  const headerRow = ws.addRow(['Pavimento', 'Tipo', 'Disciplina', 'Status', 'Progresso']);
  styleHeader(headerRow);
  addAutoFilter(ws, headerRow.number, 5);

  rows.forEach((r, i) => {
    const row = ws.addRow([r.pavimento, r.tipo, r.disciplina, r.status, r.progresso]);
    const statusCell = row.getCell(4);
    const lower = r.status.toLowerCase();
    if (lower.includes('completed') || lower.includes('concluíd')) {
      statusCell.font = { color: { argb: 'FF16A34A' }, bold: true };
    } else if (lower.includes('in_progress') || lower.includes('andamento')) {
      statusCell.font = { color: { argb: 'FFF59E0B' }, bold: true };
    } else {
      statusCell.font = { color: { argb: 'FFEF4444' } };
    }
    styleData(row, i % 2 === 1);
  });

  addPrintSetup(ws, headerRow.number);
  await downloadBlob(wb, filename);
}

// ─── CRONOGRAMA DE FASES ───────────────────────────────────────────────────────

export interface FaseRow {
  nome: string;
  peso: number | string;
  progresso: string;
  status: string;
  inicio: string;
  previsaoFim: string;
  responsavel: string;
  subEtapas: string;
  isSubStep?: boolean;
}

export async function exportCronograma(rows: FaseRow[], filename: string, meta?: ExportMeta) {
  const wb = new ExcelJS.Workbook(); wb.creator = 'ObraApp';
  const ws = wb.addWorksheet('Cronograma de Fases');

  ws.columns = [
    { key: 'nome',        width: 32 },
    { key: 'peso',        width: 10 },
    { key: 'progresso',   width: 12 },
    { key: 'status',      width: 20 },
    { key: 'inicio',      width: 14 },
    { key: 'previsaoFim', width: 14 },
    { key: 'responsavel', width: 20 },
    { key: 'subEtapas',   width: 20 },
  ];

  await addSheetHeader(wb, ws, 'Cronograma de Fases', 8, meta);

  const headerRow = ws.addRow(['Fase / Sub-etapa', 'Peso (%)', 'Progresso', 'Status', 'Início', 'Previsão Fim', 'Responsável', 'Sub-etapas']);
  styleHeader(headerRow);
  addAutoFilter(ws, headerRow.number, 8);

  rows.forEach((r) => {
    const row = ws.addRow([r.nome, r.peso, r.progresso, r.status, r.inicio, r.previsaoFim, r.responsavel, r.subEtapas]);
    if (r.isSubStep) {
      row.getCell(1).font = { italic: true, color: { argb: 'FF64748B' } };
      row.getCell(1).alignment = { indent: 2, vertical: 'middle' };
      styleData(row, false);
    } else {
      row.eachCell((c) => {
        c.fill = BLUE_LIGHT; c.font = { bold: true }; c.border = BORDERS; c.alignment = { vertical: 'middle' };
      });
      row.height = 20;
    }
  });

  addPrintSetup(ws, headerRow.number);
  await downloadBlob(wb, filename);
}

// ─── RESUMO GERAL (3 abas) ─────────────────────────────────────────────────────

export interface ResumoGeral {
  projectName: string;
  data: string;
  summary: { label: string; value: string }[];
  fases: { nome: string; peso: string; progresso: string; status: string; subEtapas: string; responsavel: string }[];
  andares: { label: string; tipo: string; eletrica: string; hidraulica: string; alvenaria: string; revestimento: string }[];
}

export async function exportResumoGeral(data: ResumoGeral, filename: string, meta?: ExportMeta) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'ObraApp';
  wb.subject = data.projectName;

  // ── Aba 1: Sumário ──────────────────────────────────────────────────────────
  const wsSumario = wb.addWorksheet('Sumário');
  wsSumario.columns = [{ width: 32 }, { width: 24 }];
  await addSheetHeader(wb, wsSumario, `Relatório Geral — ${data.projectName}`, 2, meta);

  const secSum = wsSumario.addRow(['RESUMO EXECUTIVO']);
  styleSection(secSum, 2);

  data.summary.forEach(({ label, value }, i) => {
    const r = wsSumario.addRow([label, value]);
    r.getCell(1).font = { bold: true };
    styleData(r, i % 2 === 1);
  });
  addPrintSetup(wsSumario, 1);

  // ── Aba 2: Fases ────────────────────────────────────────────────────────────
  const wsFases = wb.addWorksheet('Fases');
  wsFases.columns = [
    { width: 30 }, { width: 10 }, { width: 12 }, { width: 20 }, { width: 18 }, { width: 20 },
  ];
  await addSheetHeader(wb, wsFases, `Fases — ${data.projectName}`, 6, meta);

  const headerFases = wsFases.addRow(['Fase', 'Peso', 'Progresso', 'Status', 'Sub-etapas', 'Responsável']);
  styleHeader(headerFases);
  addAutoFilter(wsFases, headerFases.number, 6);

  data.fases.forEach((f, i) => {
    const r = wsFases.addRow([f.nome, f.peso, f.progresso, f.status, f.subEtapas, f.responsavel]);
    styleData(r, i % 2 === 1);
    const lower = f.status.toLowerCase();
    const sc = r.getCell(4);
    if (lower.includes('completed') || lower.includes('concluíd')) sc.font = { color: { argb: 'FF16A34A' }, bold: true };
    else if (lower.includes('progress') || lower.includes('andamento')) sc.font = { color: { argb: 'FFF59E0B' }, bold: true };
  });
  addPrintSetup(wsFases, headerFases.number);

  // ── Aba 3: Andares ──────────────────────────────────────────────────────────
  const wsAndares = wb.addWorksheet('Andares');
  wsAndares.columns = [
    { width: 16 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 14 },
  ];
  await addSheetHeader(wb, wsAndares, `Andares — ${data.projectName}`, 6, meta);

  const headerAndares = wsAndares.addRow(['Andar', 'Tipo', 'Elétrica', 'Hidráulica', 'Alvenaria', 'Revestimento']);
  styleHeader(headerAndares);
  addAutoFilter(wsAndares, headerAndares.number, 6);

  const statusColor = (cell: ExcelJS.Cell, v: string) => {
    if (v === 'OK')  { cell.font = { color: { argb: 'FF16A34A' }, bold: true }; }
    else if (v === 'AND') { cell.font = { color: { argb: 'FFF59E0B' }, bold: true }; }
    else { cell.font = { color: { argb: 'FFEF4444' } }; }
  };

  data.andares.forEach((a, i) => {
    const r = wsAndares.addRow([a.label, a.tipo, a.eletrica, a.hidraulica, a.alvenaria, a.revestimento]);
    styleData(r, i % 2 === 1);
    [3, 4, 5, 6].forEach(col => statusColor(r.getCell(col), r.getCell(col).value as string));
  });
  addPrintSetup(wsAndares, headerAndares.number);

  await downloadBlob(wb, filename);
}
