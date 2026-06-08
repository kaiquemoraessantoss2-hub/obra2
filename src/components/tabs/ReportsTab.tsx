'use client';

import ReportCard from '@/components/ui/report-card';
import { useAppContext } from '@/context/AppContext';
import { exportAndamento, exportCronograma, exportResumoGeral, loadExportMeta } from '@/lib/exportExcel';

export default function ReportsTab() {
  const { project, phases, currentUser, setToast } = useAppContext();

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <ReportCard
          title="Andamento por Andar"
          desc="Status de cada disciplina por pavimento"
          onClick={async () => {
            const meta = await loadExportMeta(currentUser?.companyId || '');
            const rows = (project?.floors || []).sort((a, b) => a.number - b.number).flatMap(f =>
              f.services.map(s => {
                const pct = s.status === 'COMPLETED' ? 100 : s.status === 'IN_PROGRESS' ? 50 : 0;
                return { pavimento: f.label, tipo: f.type, disciplina: s.name, status: (s.status || '').replace('_', ' '), progresso: `${pct}%` };
              }),
            );
            await exportAndamento(rows, `andamento_tecnico_${(project?.name || 'obra').replace(/\s/g, '_')}.xlsx`, meta);
            setToast({ message: 'Relatório gerado!', type: 'success' });
          }}
        />
        <ReportCard
          title="Cronograma de Fases"
          desc="Progresso detalhado de todas as fases"
          onClick={async () => {
            if (!phases || phases.length === 0) {
              setToast({ message: 'Nenhuma fase cadastrada!', type: 'error' });
              return;
            }
            const meta = await loadExportMeta(currentUser?.companyId || '');
            const rows = phases.flatMap(p => {
              const subStepsConcluidas = p.subSteps.filter((s: any) => s.status === 'COMPLETED').length;
              const phaseRow = { nome: p.name, peso: p.weight, progresso: `${p.progress}%`, status: (p.status || '').replace('_', ' '), inicio: p.startDate || '-', previsaoFim: p.endDate || '-', responsavel: p.responsible || '-', subEtapas: `${subStepsConcluidas}/${p.subSteps.length}`, isSubStep: false };
              const subRows = p.subSteps.map((s: any) => ({ nome: `  ${s.name}`, peso: '', progresso: `${s.progress}%`, status: (s.status || '').replace('_', ' '), inicio: '', previsaoFim: '', responsavel: s.responsible || '-', subEtapas: '', isSubStep: true }));
              return [phaseRow, ...subRows];
            });
            await exportCronograma(rows, `cronograma_${(project?.name || 'obra').replace(/\s/g, '_')}.xlsx`, meta);
            setToast({ message: 'Relatório gerado!', type: 'success' });
          }}
        />
        <ReportCard
          title="Resumo Geral da Obra"
          desc="Planilha completa com todos os dados"
          onClick={async () => {
            const meta = await loadExportMeta(currentUser?.companyId || '');
            const totalAndares = (project?.floors || []).length;
            const andaresConcluidos = (project?.floors || []).filter(f => f.services.every(s => s.status === 'COMPLETED')).length || 0;
            const andaresEmObra = (project?.floors || []).filter(f => f.services.some(s => s.status === 'IN_PROGRESS')).length || 0;
            const disciplinasConcluidas = (project?.floors || []).reduce((acc, f) => acc + f.services.filter((s: any) => s.status === 'COMPLETED').length, 0) || 0;
            const totalDisciplinas = (project?.floors || []).reduce((acc, f) => acc + f.services.length, 0) || 0;
            const fasesConcluidas = phases.filter(p => p.status === 'COMPLETED').length;
            const fasesEmAndamento = phases.filter(p => p.status === 'IN_PROGRESS').length;
            const subStepsConcluidas = phases.reduce((acc, p) => acc + p.subSteps.filter((s: any) => s.status === 'COMPLETED').length, 0);
            const progressoGeral = phases.length > 0 ? Math.round(phases.reduce((acc, p) => acc + p.progress, 0) / phases.length) : 0;
            const getStatus = (f: any, name: string) => {
              const s = f.services.find((svc: any) => svc.name === name);
              return s?.status === 'COMPLETED' ? 'OK' : s?.status === 'IN_PROGRESS' ? 'AND' : 'PEN';
            };
            await exportResumoGeral({
              projectName: project?.name || 'Obra',
              data: new Date().toLocaleDateString('pt-BR'),
              summary: [
                { label: 'Andares Totais', value: String(totalAndares) },
                { label: 'Andares Concluídos', value: String(andaresConcluidos) },
                { label: 'Andares em Obra', value: String(andaresEmObra) },
                { label: 'Disciplinas Concluídas', value: `${disciplinasConcluidas}/${totalDisciplinas}` },
                { label: 'Fases Concluídas', value: `${fasesConcluidas}/${phases.length}` },
                { label: 'Fases em Andamento', value: String(fasesEmAndamento) },
                { label: 'Sub-etapas Concluídas', value: String(subStepsConcluidas) },
                { label: 'Progresso Geral', value: `${progressoGeral}%` },
              ],
              fases: phases.map(p => ({
                nome: p.name,
                peso: `${p.weight}%`,
                progresso: `${p.progress}%`,
                status: p.status || '',
                subEtapas: `${p.subSteps.filter((s: any) => s.status === 'COMPLETED').length}/${p.subSteps.length}`,
                responsavel: p.responsible || '-',
              })),
              andares: (project?.floors || []).sort((a, b) => a.number - b.number).map(f => ({
                label: f.label, tipo: f.type,
                eletrica: getStatus(f, 'Elétrica'),
                hidraulica: getStatus(f, 'Hidráulica'),
                alvenaria: getStatus(f, 'Alvenaria'),
                revestimento: getStatus(f, 'Revestimento'),
              })),
            }, `relatorio_completo_${(project?.name || 'obra').replace(/\s/g, '_')}.xlsx`, meta);
            setToast({ message: 'Relatório gerado!', type: 'success' });
          }}
        />
      </div>
    </div>
  );
}
