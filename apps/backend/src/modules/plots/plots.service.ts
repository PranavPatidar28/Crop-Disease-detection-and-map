import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Plot } from '@prisma/client';

import type { Env } from '@/config/env.schema';
import { PrismaService } from '@/modules/prisma/prisma.service';

import { CreatePlotDto, UpdatePlotDto } from './dto';

@Injectable()
export class PlotsService {
  private readonly maxPlotsPerUser: number;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService<Env, true>,
  ) {
    this.maxPlotsPerUser = config.get('PLOT_MAX_PER_USER', { infer: true });
  }

  async list(userId: string): Promise<Plot[]> {
    return this.prisma.plot.findMany({
      where: { userId },
      orderBy: [{ active: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async listActive(userId: string): Promise<Plot[]> {
    return this.prisma.plot.findMany({
      where: { userId, active: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(userId: string, id: string): Promise<Plot> {
    const plot = await this.prisma.plot.findUnique({ where: { id } });
    if (!plot) throw new NotFoundException('Plot not found');
    if (plot.userId !== userId) throw new ForbiddenException();
    return plot;
  }

  async create(userId: string, dto: CreatePlotDto): Promise<Plot> {
    const activeCount = await this.prisma.plot.count({
      where: { userId, active: true },
    });
    if (activeCount >= this.maxPlotsPerUser) {
      throw new BadRequestException(
        `Plot limit reached (${this.maxPlotsPerUser}). Remove an existing plot to add a new one.`,
      );
    }

    return this.prisma.plot.create({
      data: {
        userId,
        name: dto.name,
        latitude: dto.latitude,
        longitude: dto.longitude,
        cropTypes: dto.cropTypes ?? [],
        areaAcres: dto.areaAcres ?? null,
      },
    });
  }

  async update(userId: string, id: string, dto: UpdatePlotDto): Promise<Plot> {
    await this.findById(userId, id);
    return this.prisma.plot.update({
      where: { id },
      data: { ...dto },
    });
  }

  /** Soft delete: marks the plot inactive but preserves notification provenance. */
  async remove(userId: string, id: string): Promise<Plot> {
    await this.findById(userId, id);
    return this.prisma.plot.update({
      where: { id },
      data: { active: false },
    });
  }
}
