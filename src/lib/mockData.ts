import { Project, Floor, FloorType } from '@/types';
import { INITIAL_PHASES } from './constructionPhasesMock';

const DISCIPLINES = ['Elétrica', 'Hidráulica', 'Revestimento', 'Marcenaria'];

const createFloor = (i: number, label: string, type: FloorType): Floor => ({
  id: `floor_${type}_${i}`,
  number: i,
  label: label,
  type: type,
  phase: i < 5 ? 'Finalization' : i < 12 ? 'Finishing' : 'Structure',
  services: DISCIPLINES.map((d, di) => ({
    id: `svc_${type}_${i}_${di}`,
    name: d,
    status: i < 5 ? 'COMPLETED' : 'NOT_STARTED'
  }))
});

export const mockProject: Project = {
  id: 'proj_1',
  companyId: 'comp_1',
  name: 'Residencial Aurora',
  location: 'Av. Paulista, 1000 - SP',

  totalFloors: 15,
  basements: 2,
  hasLeisure: true,
  hasAtrium: true,
  technicalAreas: 1,
  floors: [
    ...Array.from({ length: 2 }, (_, i) => createFloor(-2 + i, `Subsolo ${i + 1}`, 'BASEMENT')),
    createFloor(0, 'Térreo', 'GROUND'),
    createFloor(1, 'Lazer', 'LEISURE'),
    ...Array.from({ length: 15 }, (_, i) => createFloor(i + 2, `${i + 1}º Andar`, 'REGULAR')),
    createFloor(17, 'Área Técnica', 'TECHNICAL')
  ],
  phases: INITIAL_PHASES
};
