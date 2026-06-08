'use client';

import { supabase } from './supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

export type WeatherType = 'SUNNY' | 'PARTLY_CLOUDY' | 'CLOUDY' | 'RAINY' | 'STORMY';

export interface RDOWorker {
  trade: string;
  count: number;
}

export interface RDO {
  id: string;
  projectId: string;
  date: string;
  weather: WeatherType;
  temperature?: number;
  workersJson: RDOWorker[];
  activities: string;
  occurrences: string;
  materialsUsed: string;
  observations: string;
  createdBy: string;
  createdAt: string;
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export async function loadRDOs(projectId: string): Promise<RDO[]> {
  const { data, error } = await supabase
    .from('rdos')
    .select('*')
    .eq('project_id', projectId)
    .order('date', { ascending: false });
  if (error) { console.error('loadRDOs', error); return []; }
  return (data || []).map(mapRDO);
}

export async function loadRDO(id: string): Promise<RDO | null> {
  const { data, error } = await supabase
    .from('rdos')
    .select('*')
    .eq('id', id)
    .single();
  if (error) { console.error('loadRDO', error); return null; }
  return mapRDO(data);
}

export async function saveRDO(
  r: Omit<RDO, 'id' | 'createdAt'>
): Promise<RDO | null> {
  const { data, error } = await supabase
    .from('rdos')
    .insert([{
      project_id: r.projectId,
      date: r.date,
      weather: r.weather,
      temperature: r.temperature ?? null,
      workers_json: r.workersJson,
      activities: r.activities,
      occurrences: r.occurrences || null,
      materials_used: r.materialsUsed || null,
      observations: r.observations || null,
      created_by: r.createdBy,
    }])
    .select()
    .single();
  if (error) { console.error('saveRDO', error); return null; }
  return mapRDO(data);
}

export async function updateRDO(
  id: string,
  r: Partial<Omit<RDO, 'id' | 'createdAt' | 'projectId' | 'createdBy'>>
): Promise<boolean> {
  const payload: Record<string, unknown> = {};
  if (r.date !== undefined) payload.date = r.date;
  if (r.weather !== undefined) payload.weather = r.weather;
  if (r.temperature !== undefined) payload.temperature = r.temperature;
  if (r.workersJson !== undefined) payload.workers_json = r.workersJson;
  if (r.activities !== undefined) payload.activities = r.activities;
  if (r.occurrences !== undefined) payload.occurrences = r.occurrences || null;
  if (r.materialsUsed !== undefined) payload.materials_used = r.materialsUsed || null;
  if (r.observations !== undefined) payload.observations = r.observations || null;
  const { error } = await supabase.from('rdos').update(payload).eq('id', id);
  if (error) { console.error('updateRDO', error); return false; }
  return true;
}

export async function deleteRDO(id: string): Promise<boolean> {
  const { error } = await supabase.from('rdos').delete().eq('id', id);
  if (error) { console.error('deleteRDO', error); return false; }
  return true;
}

// ─── PDF Print ────────────────────────────────────────────────────────────────

export function printRDO(rdo: RDO, projectName: string) {
  const totalWorkers = rdo.workersJson.reduce((s, w) => s + w.count, 0);
  const weatherLabels: Record<WeatherType, string> = {
    SUNNY: '☀️ Ensolarado', PARTLY_CLOUDY: '⛅ Parcialmente nublado',
    CLOUDY: '☁️ Nublado', RAINY: '🌧️ Chuvoso', STORMY: '⛈️ Tempestuoso',
  };
  const dateStr = new Date(rdo.date + 'T12:00:00').toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  });

  const workersRows = rdo.workersJson.length
    ? rdo.workersJson.map(w =>
        `<tr><td>${w.trade}</td><td style="text-align:center">${w.count}</td></tr>`
      ).join('')
    : '<tr><td colspan="2" style="color:#888">Nenhum trabalhador registrado</td></tr>';

  const section = (title: string, content: string) =>
    content
      ? `<div class="section"><div class="section-title">${title}</div><div class="section-body">${content.replace(/\n/g, '<br/>')}</div></div>`
      : '';

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<title>RDO — ${dateStr}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Arial,sans-serif;font-size:12px;color:#111;padding:20px}
  h1{font-size:18px;margin-bottom:4px}
  .subtitle{color:#555;font-size:12px;margin-bottom:16px}
  .meta{display:flex;gap:24px;margin-bottom:16px;padding:10px 12px;background:#f5f5f5;border-radius:4px}
  .meta-item{display:flex;flex-direction:column;gap:2px}
  .meta-label{font-size:10px;color:#888;text-transform:uppercase;letter-spacing:.05em}
  .meta-value{font-size:13px;font-weight:bold}
  .section{margin-bottom:14px}
  .section-title{font-size:11px;font-weight:bold;text-transform:uppercase;letter-spacing:.08em;color:#555;border-bottom:1px solid #ddd;padding-bottom:3px;margin-bottom:6px}
  .section-body{font-size:12px;line-height:1.5;color:#222}
  table{width:100%;border-collapse:collapse;margin-bottom:4px}
  th{background:#eee;font-size:10px;text-transform:uppercase;letter-spacing:.05em;padding:5px 8px;text-align:left}
  td{padding:4px 8px;border-bottom:1px solid #eee;font-size:12px}
  .total-row td{font-weight:bold;background:#f9f9f9}
  @media print{body{padding:10px}button{display:none}}
</style>
</head>
<body>
<h1>Relatório Diário de Obra</h1>
<div class="subtitle">${projectName}</div>
<div class="meta">
  <div class="meta-item"><span class="meta-label">Data</span><span class="meta-value">${dateStr}</span></div>
  <div class="meta-item"><span class="meta-label">Clima</span><span class="meta-value">${weatherLabels[rdo.weather]}</span></div>
  ${rdo.temperature != null ? `<div class="meta-item"><span class="meta-label">Temperatura</span><span class="meta-value">${rdo.temperature}°C</span></div>` : ''}
  <div class="meta-item"><span class="meta-label">Total mão de obra</span><span class="meta-value">${totalWorkers} pessoas</span></div>
</div>
<div class="section">
  <div class="section-title">Mão de Obra</div>
  <table>
    <thead><tr><th>Função</th><th style="text-align:center">Qtd</th></tr></thead>
    <tbody>${workersRows}</tbody>
    <tfoot><tr class="total-row"><td>Total</td><td style="text-align:center">${totalWorkers}</td></tr></tfoot>
  </table>
</div>
${section('Atividades Realizadas', rdo.activities)}
${section('Materiais Utilizados', rdo.materialsUsed)}
${section('Ocorrências', rdo.occurrences)}
${section('Observações', rdo.observations)}
<div style="margin-top:32px;font-size:10px;color:#aaa">Gerado em ${new Date().toLocaleString('pt-BR')} — Obramesh</div>
<script>window.onload=()=>window.print()</script>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(html);
  win.document.close();
}

// ─── Mapper ───────────────────────────────────────────────────────────────────

function mapRDO(r: Record<string, unknown>): RDO {
  return {
    id: r.id as string,
    projectId: r.project_id as string,
    date: r.date as string,
    weather: r.weather as WeatherType,
    temperature: r.temperature != null ? Number(r.temperature) : undefined,
    workersJson: (r.workers_json as RDOWorker[]) || [],
    activities: (r.activities as string) || '',
    occurrences: (r.occurrences as string) || '',
    materialsUsed: (r.materials_used as string) || '',
    observations: (r.observations as string) || '',
    createdBy: r.created_by as string,
    createdAt: r.created_at as string,
  };
}
