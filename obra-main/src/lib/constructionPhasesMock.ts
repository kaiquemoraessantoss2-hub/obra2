import { ConstructionPhase, SubStep, FloorExecution } from '../types';

const createFloorExecution = (
  floorId: string,
  floorLabel: string,
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'DELAYED',
  progress: number,
  measuredQuantity?: number,
  unit?: string,
  observations?: string
): FloorExecution => ({
  floorId,
  floorLabel,
  status,
  progress,
  measuredQuantity,
  unit,
  observations
});

const floorsList = [
  { id: 'floor_BASEMENT_1', label: 'Subsolo 2' },
  { id: 'floor_BASEMENT_2', label: 'Subsolo 1' },
  { id: 'floor_GROUND_0', label: 'Térreo' },
  { id: 'floor_LEISURE_1', label: 'Lazer' },
  { id: 'floor_REGULAR_1', label: '1º Andar' },
  { id: 'floor_REGULAR_2', label: '2º Andar' },
  { id: 'floor_REGULAR_3', label: '3º Andar' },
  { id: 'floor_REGULAR_4', label: '4º Andar' },
  { id: 'floor_REGULAR_5', label: '5º Andar' },
  { id: 'floor_REGULAR_6', label: '6º Andar' },
  { id: 'floor_REGULAR_7', label: '7º Andar' },
  { id: 'floor_REGULAR_8', label: '8º Andar' },
  { id: 'floor_REGULAR_9', label: '9º Andar' },
  { id: 'floor_REGULAR_10', label: '10º Andar' },
  { id: 'floor_REGULAR_11', label: '11º Andar' },
  { id: 'floor_REGULAR_12', label: '12º Andar' },
  { id: 'floor_REGULAR_13', label: '13º Andar' },
  { id: 'floor_REGULAR_14', label: '14º Andar' },
  { id: 'floor_REGULAR_15', label: '15º Andar' },
  { id: 'floor_TECHNICAL_1', label: 'Área Técnica' },
];

const regularFloors = floorsList.filter(f => f.label.includes('º Andar'));
const allFloors = floorsList;

export const INITIAL_PHASES: ConstructionPhase[] = [
  {
    id: 'p1',
    name: 'PRÉ-OBRA',
    icon: 'FileText',
    color: 'bg-blue-500',
    progress: 100,
    status: 'COMPLETED',
    weight: 5,
    startDate: '2024-01-01',
    endDate: '2024-02-15',
    actualEndDate: '2024-02-10',
    responsible: 'Eng. Ricardo Santos',
    approvedBy: 'Diretoria Técnica',
    approvedAt: '2024-02-12',
    history: [
      { date: '2024-01-10', note: 'Início do levantamento de projetos', author: 'Ricardo' },
      { date: '2024-02-10', note: 'Alvará emitido pela prefeitura', author: 'Ricardo' }
    ],
    subSteps: [
      { id: 's1-1', name: 'Análise e aquisição do terreno', status: 'COMPLETED', progress: 100, responsible: 'Diretoria', hasFloorBreakdown: false },
      { id: 's1-2', name: 'Sondagem do solo (SPT)', status: 'COMPLETED', progress: 100, responsible: 'Geotécnico', hasFloorBreakdown: false },
      { id: 's1-3', name: 'Elaboração de projetos (Arq/Est/Ele/Hid)', status: 'COMPLETED', progress: 100, responsible: 'Equipe de Projetos', hasFloorBreakdown: false },
      { id: 's1-4', name: 'Aprovações e alvarás na prefeitura', status: 'COMPLETED', progress: 100, responsible: 'Despachante', hasFloorBreakdown: false },
      { id: 's1-5', name: 'Contratação de empreiteiras e fornecedores', status: 'COMPLETED', progress: 100, responsible: 'Suprimentos', hasFloorBreakdown: false },
    ]
  },
  {
    id: 'p2',
    name: 'TERRAPLANAGEM E FUNDAÇÃO',
    icon: 'Box',
    color: 'bg-amber-600',
    progress: 85,
    status: 'IN_PROGRESS',
    weight: 10,
    dependsOn: ['p1'],
    startDate: '2024-02-16',
    endDate: '2024-04-30',
    responsible: 'Eng. Marcos Oliveira',
    subSteps: [
      { id: 's2-1', name: 'Limpeza e cercamento do terreno', status: 'COMPLETED', progress: 100, hasFloorBreakdown: false },
      { id: 's2-2', name: 'Terraplanagem e nivelamento', status: 'COMPLETED', progress: 100, hasFloorBreakdown: false },
      { id: 's2-3', name: 'Sondagem e locação da obra', status: 'COMPLETED', progress: 100, hasFloorBreakdown: false },
      { id: 's2-4', name: 'Escavação', status: 'COMPLETED', progress: 100, hasFloorBreakdown: false },
      { id: 's2-5', name: 'Execução de fundações (estacas/radier)', status: 'IN_PROGRESS', progress: 70, observations: 'Aguardando cura das estacas piloto', hasFloorBreakdown: false },
      { id: 's2-6', name: 'Estrutura de contenção e arrimo', status: 'NOT_STARTED', progress: 0, hasFloorBreakdown: false },
    ]
  },
  {
    id: 'p3',
    name: 'ESTRUTURA',
    icon: 'Layers',
    color: 'bg-indigo-500',
    progress: 0,
    status: 'NOT_STARTED',
    weight: 25,
    dependsOn: ['p2'],
    startDate: '2024-05-01',
    endDate: '2024-12-20',
    responsible: 'Eng. Ricardo Santos',
    subSteps: [
      { 
        id: 's3-1', 
        name: 'Montagem de formas', 
        status: 'NOT_STARTED', 
        progress: 0, 
        hasFloorBreakdown: true,
        estimatedQuantity: 18,
        unit: 'pavimentos',
        floorExecutions: allFloors.map((f, i) => createFloorExecution(f.id, f.label, i < 5 ? 'COMPLETED' : i < 8 ? 'IN_PROGRESS' : 'NOT_STARTED', i < 5 ? 100 : i < 8 ? 75 : 0))
      },
      { 
        id: 's3-2', 
        name: 'Armação (ferragens)', 
        status: 'NOT_STARTED', 
        progress: 0, 
        hasFloorBreakdown: true,
        estimatedQuantity: 18,
        unit: 'pavimentos',
        floorExecutions: allFloors.map((f, i) => createFloorExecution(f.id, f.label, i < 4 ? 'COMPLETED' : i < 7 ? 'IN_PROGRESS' : 'NOT_STARTED', i < 4 ? 100 : i < 7 ? 60 : 0))
      },
      { 
        id: 's3-3', 
        name: 'Concretagem por pavimento', 
        status: 'NOT_STARTED', 
        progress: 0, 
        hasFloorBreakdown: true,
        estimatedQuantity: 18,
        unit: 'pavimentos',
        floorExecutions: allFloors.map((f, i) => createFloorExecution(f.id, f.label, i < 3 ? 'COMPLETED' : i < 6 ? 'IN_PROGRESS' : 'NOT_STARTED', i < 3 ? 100 : i < 6 ? 45 : 0, undefined, undefined, i < 3 ? 'Concretagem concluída com sucesso' : i < 6 ? 'Em execução - laje concretada' : undefined))
      },
      { id: 's3-4', name: 'Desforma e cura do concreto', status: 'NOT_STARTED', progress: 0, hasFloorBreakdown: false },
      { id: 's3-5', name: 'Lajes e escadas', status: 'NOT_STARTED', progress: 0, hasFloorBreakdown: false },
    ]
  },
  {
    id: 'p4',
    name: 'ALVENARIA E COBERTURA',
    icon: 'Building',
    color: 'bg-orange-500',
    progress: 0,
    status: 'NOT_STARTED',
    weight: 15,
    dependsOn: ['p3'],
    startDate: '2024-08-15',
    endDate: '2025-02-10',
    responsible: 'Eng. Marcos Oliveira',
    subSteps: [
      { 
        id: 's4-1', 
        name: 'Levantamento de paredes', 
        status: 'NOT_STARTED', 
        progress: 0, 
        hasFloorBreakdown: true,
        estimatedQuantity: 18,
        unit: 'pavimentos',
        floorExecutions: allFloors.map((f, i) => createFloorExecution(f.id, f.label, i < 6 ? 'COMPLETED' : i < 10 ? 'IN_PROGRESS' : 'NOT_STARTED', i < 6 ? 100 : i < 10 ? 55 : 0))
      },
      { id: 's4-2', name: 'Vergas e contravergas', status: 'NOT_STARTED', progress: 0, hasFloorBreakdown: false },
      { id: 's4-3', name: 'Laje de cobertura', status: 'NOT_STARTED', progress: 0, hasFloorBreakdown: false },
      { id: 's4-4', name: 'Estrutura e cobertura do telhado', status: 'NOT_STARTED', progress: 0, hasFloorBreakdown: false },
      { id: 's4-5', name: 'Impermeabilização de lajes', status: 'NOT_STARTED', progress: 0, hasFloorBreakdown: false },
    ]
  },
  {
    id: 'p5a',
    name: 'INSTALAÇÕES HIDRÁULICAS',
    icon: 'Droplets',
    color: 'bg-cyan-500',
    progress: 0,
    status: 'NOT_STARTED',
    weight: 5,
    dependsOn: ['p3'],
    startDate: '2024-09-01',
    endDate: '2025-04-30',
    responsible: 'Eng. Hidráulico Silva',
    subSteps: [
      { id: 's5a-1', name: 'Projeto e aprovação hidráulico', status: 'COMPLETED', progress: 100, hasFloorBreakdown: false },
      { id: 's5a-2', name: 'Reservatório inferior e superior', status: 'IN_PROGRESS', progress: 65, hasFloorBreakdown: false },
      { id: 's5a-3', name: 'Casa de bombas', status: 'IN_PROGRESS', progress: 40, hasFloorBreakdown: false },
      { id: 's5a-4', name: 'Ramal de entrada de água (ligação concessionária)', status: 'NOT_STARTED', progress: 0, hasFloorBreakdown: false },
      { 
        id: 's5a-5', 
        name: 'Plumadas de água fria por andar', 
        status: 'NOT_STARTED', 
        progress: 0, 
        hasFloorBreakdown: true,
        estimatedQuantity: 18,
        unit: 'prumadas',
        floorExecutions: regularFloors.map((f, i) => createFloorExecution(f.id, f.label, i < 8 ? 'COMPLETED' : i < 12 ? 'IN_PROGRESS' : 'NOT_STARTED', i < 8 ? 100 : i < 12 ? 70 : 0, i < 8 ? 3.2 + (i * 0.1) : undefined, 'm', i < 8 ? 'Concluído' : 'Em execução'))
      },
      { 
        id: 's5a-6', 
        name: 'Plumadas de água quente por andar', 
        status: 'NOT_STARTED', 
        progress: 0, 
        hasFloorBreakdown: true,
        estimatedQuantity: 18,
        unit: 'prumadas',
        floorExecutions: regularFloors.map((f, i) => createFloorExecution(f.id, f.label, i < 5 ? 'COMPLETED' : i < 10 ? 'IN_PROGRESS' : 'NOT_STARTED', i < 5 ? 100 : i < 10 ? 45 : 0))
      },
      { 
        id: 's5a-7', 
        name: 'Plumadas de esgoto sanitário por andar', 
        status: 'NOT_STARTED', 
        progress: 0, 
        hasFloorBreakdown: true,
        estimatedQuantity: 18,
        unit: 'prumadas',
        floorExecutions: regularFloors.map((f, i) => createFloorExecution(f.id, f.label, i < 7 ? 'COMPLETED' : i < 11 ? 'IN_PROGRESS' : 'NOT_STARTED', i < 7 ? 100 : i < 11 ? 60 : 0, i < 7 ? 4.5 + (i * 0.15) : undefined, 'm'))
      },
      { 
        id: 's5a-8', 
        name: 'Plumadas de águas pluviais por andar', 
        status: 'NOT_STARTED', 
        progress: 0, 
        hasFloorBreakdown: true,
        estimatedQuantity: 18,
        unit: 'prumadas',
        floorExecutions: regularFloors.map((f, i) => createFloorExecution(f.id, f.label, i < 6 ? 'COMPLETED' : i < 10 ? 'IN_PROGRESS' : 'NOT_STARTED', i < 6 ? 100 : i < 10 ? 50 : 0))
      },
      { 
        id: 's5a-9', 
        name: 'Plumadas de gás por andar', 
        status: 'NOT_STARTED', 
        progress: 0, 
        hasFloorBreakdown: true,
        estimatedQuantity: 15,
        unit: 'prumadas',
        floorExecutions: regularFloors.slice(0, 15).map((f, i) => createFloorExecution(f.id, f.label, i < 4 ? 'COMPLETED' : i < 8 ? 'IN_PROGRESS' : 'NOT_STARTED', i < 4 ? 100 : i < 8 ? 65 : 0, i < 4 ? 3.8 : undefined, 'm'))
      },
      { id: 's5a-10', name: 'Barrilete e distribuição horizontal', status: 'NOT_STARTED', progress: 0, hasFloorBreakdown: false },
      { id: 's5a-11', name: 'Testes de pressão e estanqueidade', status: 'NOT_STARTED', progress: 0, hasFloorBreakdown: false },
      { id: 's5a-12', name: 'Conexão das prumadas aos pontos dos apartamentos', status: 'NOT_STARTED', progress: 0, hasFloorBreakdown: false },
    ]
  },
  {
    id: 'p5b',
    name: 'INSTALAÇÕES ELÉTRICAS',
    icon: 'Zap',
    color: 'bg-rose-500',
    progress: 0,
    status: 'NOT_STARTED',
    weight: 5,
    dependsOn: ['p3'],
    startDate: '2024-09-01',
    endDate: '2025-04-30',
    responsible: 'Eng. Elétrico Santos',
    subSteps: [
      { id: 's5b-1', name: 'Projeto e aprovação ANEEL/concessionária', status: 'COMPLETED', progress: 100, hasFloorBreakdown: false },
      { id: 's5b-2', name: 'Entrada de energia e QGBT (quadro geral)', status: 'IN_PROGRESS', progress: 55, hasFloorBreakdown: false },
      { id: 's5b-3', name: 'Subestação (se necessário)', status: 'NOT_STARTED', progress: 0, hasFloorBreakdown: false },
      { 
        id: 's5b-4', 
        name: 'Shaft elétrico por andar', 
        status: 'NOT_STARTED', 
        progress: 0, 
        hasFloorBreakdown: true,
        estimatedQuantity: 18,
        unit: 'shafts',
        floorExecutions: allFloors.map((f, i) => createFloorExecution(f.id, f.label, i < 6 ? 'COMPLETED' : i < 10 ? 'IN_PROGRESS' : 'NOT_STARTED', i < 6 ? 100 : i < 10 ? 60 : 0))
      },
      { 
        id: 's5b-5', 
        name: 'Alimentadores verticais (prumadas elétricas) por andar', 
        status: 'NOT_STARTED', 
        progress: 0, 
        hasFloorBreakdown: true,
        estimatedQuantity: 18,
        unit: 'prumadas',
        floorExecutions: regularFloors.map((f, i) => createFloorExecution(f.id, f.label, i < 5 ? 'COMPLETED' : i < 9 ? 'IN_PROGRESS' : 'NOT_STARTED', i < 5 ? 100 : i < 9 ? 45 : 0, i < 5 ? 2.8 : undefined, 'm'))
      },
      { 
        id: 's5b-6', 
        name: 'Quadros de medição por andar', 
        status: 'NOT_STARTED', 
        progress: 0, 
        hasFloorBreakdown: true,
        estimatedQuantity: 15,
        unit: 'apartamentos',
        floorExecutions: regularFloors.slice(0, 15).map((f, i) => createFloorExecution(f.id, f.label, i < 6 ? 'COMPLETED' : i < 10 ? 'IN_PROGRESS' : 'NOT_STARTED', i < 6 ? 100 : i < 10 ? 35 : 0))
      },
      { 
        id: 's5b-7', 
        name: 'Circuitos internos dos apartamentos por andar', 
        status: 'NOT_STARTED', 
        progress: 0, 
        hasFloorBreakdown: true,
        estimatedQuantity: 15,
        unit: 'apartamentos',
        floorExecutions: regularFloors.slice(0, 15).map((f, i) => createFloorExecution(f.id, f.label, i < 3 ? 'COMPLETED' : i < 7 ? 'IN_PROGRESS' : 'NOT_STARTED', i < 3 ? 100 : i < 7 ? 25 : 0))
      },
      { id: 's5b-8', name: 'Iluminação de emergência e sinalização', status: 'NOT_STARTED', progress: 0, hasFloorBreakdown: false },
      { id: 's5b-9', name: 'SPDA (para-raios) — mastro, descidas e malha', status: 'NOT_STARTED', progress: 0, hasFloorBreakdown: false },
      { 
        id: 's5b-10', 
        name: 'Cabeamento estruturado (dados/voz) por andar', 
        status: 'NOT_STARTED', 
        progress: 0, 
        hasFloorBreakdown: true,
        estimatedQuantity: 15,
        unit: 'apartamentos',
        floorExecutions: regularFloors.slice(0, 15).map((f, i) => createFloorExecution(f.id, f.label, i < 2 ? 'COMPLETED' : i < 5 ? 'IN_PROGRESS' : 'NOT_STARTED', i < 2 ? 100 : i < 5 ? 15 : 0))
      },
      { 
        id: 's5b-11', 
        name: 'CFTV e controle de acesso por andar', 
        status: 'NOT_STARTED', 
        progress: 0, 
        hasFloorBreakdown: true,
        estimatedQuantity: 18,
        unit: 'pavimentos',
        floorExecutions: allFloors.map((f, i) => createFloorExecution(f.id, f.label, 'NOT_STARTED', 0))
      },
      { id: 's5b-12', name: 'Interfone/porteiro eletrônico por andar', status: 'NOT_STARTED', progress: 0, hasFloorBreakdown: false },
      { id: 's5b-13', name: 'Testes e comissionamento', status: 'NOT_STARTED', progress: 0, hasFloorBreakdown: false },
    ]
  },
  {
    id: 'p6',
    name: 'REVESTIMENTOS',
    icon: 'Droplets',
    color: 'bg-teal-500',
    progress: 0,
    status: 'NOT_STARTED',
    weight: 15,
    dependsOn: ['p4', 'p5a', 'p5b'],
    startDate: '2025-01-15',
    endDate: '2025-08-30',
    responsible: 'Mestre Oliveira',
    subSteps: [
      { id: 's6-1', name: 'Chapisco, emboço e reboco', status: 'NOT_STARTED', progress: 0, hasFloorBreakdown: false },
      { 
        id: 's6-2', 
        name: 'Contrapiso', 
        status: 'NOT_STARTED', 
        progress: 0, 
        hasFloorBreakdown: true,
        estimatedQuantity: 15,
        unit: 'apartamentos',
        floorExecutions: regularFloors.slice(0, 15).map((f, i) => createFloorExecution(f.id, f.label, i < 4 ? 'COMPLETED' : i < 8 ? 'IN_PROGRESS' : 'NOT_STARTED', i < 4 ? 100 : i < 8 ? 50 : 0))
      },
      { 
        id: 's6-3', 
        name: 'Assentamento de piso', 
        status: 'NOT_STARTED', 
        progress: 0, 
        hasFloorBreakdown: true,
        estimatedQuantity: 15,
        unit: 'apartamentos',
        floorExecutions: regularFloors.slice(0, 15).map((f, i) => createFloorExecution(f.id, f.label, i < 2 ? 'COMPLETED' : i < 5 ? 'IN_PROGRESS' : 'NOT_STARTED', i < 2 ? 100 : i < 5 ? 30 : 0))
      },
      { 
        id: 's6-4', 
        name: 'Revestimento de paredes', 
        status: 'NOT_STARTED', 
        progress: 0, 
        hasFloorBreakdown: true,
        estimatedQuantity: 15,
        unit: 'apartamentos',
        floorExecutions: regularFloors.slice(0, 15).map((f, i) => createFloorExecution(f.id, f.label, 'NOT_STARTED', 0))
      },
      { id: 's6-5', name: 'Fachada', status: 'NOT_STARTED', progress: 0, hasFloorBreakdown: false },
    ]
  },
  {
    id: 'p7',
    name: 'ACABAMENTOS',
    icon: 'CheckCircle',
    color: 'bg-emerald-500',
    progress: 0,
    status: 'NOT_STARTED',
    weight: 10,
    dependsOn: ['p6'],
    startDate: '2025-05-01',
    endDate: '2025-11-15',
    responsible: 'Arq. Ana Costa',
    subSteps: [
      { id: 's7-1', name: 'Instalação de esquadrias', status: 'NOT_STARTED', progress: 0, hasFloorBreakdown: false },
      { id: 's7-2', name: 'Gesso/drywall e forros', status: 'NOT_STARTED', progress: 0, hasFloorBreakdown: false },
      { id: 's7-3', name: 'Pintura interna e externa', status: 'NOT_STARTED', progress: 0, hasFloorBreakdown: false },
      { id: 's7-4', name: 'Louças e metais', status: 'NOT_STARTED', progress: 0, hasFloorBreakdown: false },
      { id: 's7-5', name: 'Bancadas e mármores', status: 'NOT_STARTED', progress: 0, hasFloorBreakdown: false },
      { id: 's7-6', name: 'Rodapés e soleiras', status: 'NOT_STARTED', progress: 0, hasFloorBreakdown: false },
      { id: 's7-7', name: 'Tomadas e luminárias', status: 'NOT_STARTED', progress: 0, hasFloorBreakdown: false },
    ]
  },
  {
    id: 'p8',
    name: 'ÁREAS COMUNS',
    icon: 'Users',
    color: 'bg-violet-500',
    progress: 0,
    status: 'NOT_STARTED',
    weight: 5,
    dependsOn: ['p6'],
    startDate: '2025-08-01',
    endDate: '2025-12-15',
    responsible: 'Eng. Ricardo Santos',
    subSteps: [
      { id: 's8-1', name: 'Hall de entrada e circulações', status: 'NOT_STARTED', progress: 0, hasFloorBreakdown: false },
      { id: 's8-2', name: 'Garagem e pavimentação externa', status: 'NOT_STARTED', progress: 0, hasFloorBreakdown: false },
      { id: 's8-3', name: 'Paisagismo e jardinagem', status: 'NOT_STARTED', progress: 0, hasFloorBreakdown: false },
      { id: 's8-4', name: 'Áreas de lazer', status: 'NOT_STARTED', progress: 0, hasFloorBreakdown: false },
      { id: 's8-5', name: 'Guarita e portaria', status: 'NOT_STARTED', progress: 0, hasFloorBreakdown: false },
    ]
  },
  {
    id: 'p9',
    name: 'ENTREGA',
    icon: 'Shield',
    color: 'bg-slate-700',
    progress: 0,
    status: 'NOT_STARTED',
    weight: 5,
    dependsOn: ['p7', 'p8'],
    startDate: '2026-01-01',
    endDate: '2026-02-28',
    responsible: 'Diretoria de Operações',
    subSteps: [
      { id: 's9-1', name: 'Vistoria técnica (punch list)', status: 'NOT_STARTED', progress: 0, hasFloorBreakdown: false },
      { id: 's9-2', name: 'Correção de pendências', status: 'NOT_STARTED', progress: 0, hasFloorBreakdown: false },
      { id: 's9-3', name: 'Limpeza final (pós-obra)', status: 'NOT_STARTED', progress: 0, hasFloorBreakdown: false },
      { id: 's9-4', name: 'Obtenção do Habite-se', status: 'NOT_STARTED', progress: 0, hasFloorBreakdown: false },
      { id: 's9-5', name: 'Averbação e Vistorias Individuais', status: 'NOT_STARTED', progress: 0, hasFloorBreakdown: false },
      { id: 's9-6', name: 'Entrega das chaves', status: 'NOT_STARTED', progress: 0, hasFloorBreakdown: false },
    ]
  }
];

export function calculatePhaseProgress(phase: ConstructionPhase): number {
  if (phase.subSteps.length === 0) return 0;
  
  const totalProgress = phase.subSteps.reduce((acc, subStep) => {
    if (subStep.hasFloorBreakdown && subStep.floorExecutions && subStep.floorExecutions.length > 0) {
      const floorSum = subStep.floorExecutions.reduce((sum, fe) => sum + fe.progress, 0);
      return acc + (floorSum / subStep.floorExecutions.length);
    }
    return acc + subStep.progress;
  }, 0);
  
  return Math.round(totalProgress / phase.subSteps.length);
}

export function getPhaseStatus(phase: ConstructionPhase): 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'DELAYED' {
  const progress = calculatePhaseProgress(phase);
  if (progress === 0) return 'NOT_STARTED';
  if (progress === 100) return 'COMPLETED';
  return 'IN_PROGRESS';
}