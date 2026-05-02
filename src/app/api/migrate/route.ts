import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { companies, projects, users } = data;

    // 1. Migrar Empresas
    if (companies && companies.length > 0) {
      for (const company of companies) {
        await prisma.company.upsert({
          where: { id: company.id },
          update: {
            name: company.name,
            plan: company.plan,
            billingStatus: company.billingStatus,
          },
          create: {
            id: company.id,
            name: company.name,
            email: company.email || `${company.id}@placeholder.com`,
            plan: company.plan,
            billingStatus: company.billingStatus,
          },
        });
      }
    }

    // 2. Migrar Projetos e Pavimentos
    if (projects && projects.length > 0) {
      for (const project of projects) {
        // Criar ou atualizar o projeto
        await prisma.project.upsert({
          where: { id: project.id },
          update: {
            name: project.name,
            location: project.location,
            totalFloors: project.totalFloors,
            basements: project.basements,
          },
          create: {
            id: project.id,
            name: project.name,
            location: project.location,
            totalFloors: project.totalFloors,
            basements: project.basements,
            startDate: new Date(),
            companyId: project.companyId,
          },
        });

        // Migrar Pavimentos do projeto
        if (project.floors && project.floors.length > 0) {
          for (const floor of project.floors) {
            await prisma.floor.upsert({
              where: {
                projectId_number: {
                  projectId: project.id,
                  number: floor.number,
                },
              },
              update: {
                label: floor.label,
                type: floor.type,
              },
              create: {
                id: floor.id,
                projectId: project.id,
                number: floor.number,
                label: floor.label,
                type: floor.type,
              },
            });
          }
        }
      }
    }

    return NextResponse.json({ success: true, message: 'Migração concluída com sucesso!' });
  } catch (error: any) {
    console.error('Erro na migração:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
