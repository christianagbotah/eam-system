// ============================================================================
// BASE REPOSITORY — Generic CRUD with pagination, transaction support
// ============================================================================

import { db } from '@/lib/db';
import { NotFoundError } from '@/lib/errors';

/**
 * Generic repository providing common CRUD operations for any Prisma model.
 *
 * Usage:
 *   const twinRepo = new BaseRepository<DigitalTwin, ...>('digitalTwin');
 *   const twin = await twinRepo.findByIdOrFail('some-id');
 */
export class BaseRepository<T, CreateInput = Record<string, unknown>, UpdateInput = Partial<CreateInput>> {
  private modelName: string;
  private model: Record<string, (...args: unknown[]) => unknown>;

  constructor(modelName: string) {
    this.modelName = modelName;
    this.model = (db as unknown as Record<string, Record<string, (...args: unknown[]) => unknown>>)[modelName] as Record<string, (...args: unknown[]) => unknown>;
  }

  async findById(id: string, include?: Record<string, unknown>): Promise<T | null> {
    return this.model.findUnique({ where: { id }, include }) as Promise<T | null>;
  }

  async findByIdOrFail(id: string, include?: Record<string, unknown>): Promise<T> {
    const record = await this.findById(id, include);
    if (!record) {
      throw new NotFoundError(this.modelName, id);
    }
    return record;
  }

  async findMany(params: {
    where?: Record<string, unknown>;
    include?: Record<string, unknown>;
    orderBy?: Record<string, unknown>;
    skip?: number;
    take?: number;
  }): Promise<T[]> {
    return this.model.findMany(params as Record<string, unknown>) as Promise<T[]>;
  }

  async findManyPaginated(params: {
    where?: Record<string, unknown>;
    include?: Record<string, unknown>;
    orderBy?: Record<string, unknown>;
    page: number;
    limit: number;
    search?: Record<string, unknown>;
  }): Promise<{ data: T[]; total: number }> {
    const { where, include, orderBy, page, limit, search } = params;
    const skip = (page - 1) * limit;
    const fullWhere = search ? { AND: [where, search] } : where;

    const [data, total] = await Promise.all([
      this.model.findMany({ where: fullWhere, include, orderBy, skip, take: limit } as Record<string, unknown>) as Promise<T[]>,
      this.model.count({ where: fullWhere } as Record<string, unknown>) as Promise<number>,
    ]);

    return { data, total };
  }

  async create(data: CreateInput): Promise<T> {
    return this.model.create({ data } as Record<string, unknown>) as Promise<T>;
  }

  async update(id: string, data: UpdateInput): Promise<T> {
    await this.findByIdOrFail(id);
    return this.model.update({ where: { id }, data } as Record<string, unknown>) as Promise<T>;
  }

  async delete(id: string): Promise<T> {
    await this.findByIdOrFail(id);
    return this.model.delete({ where: { id } } as Record<string, unknown>) as Promise<T>;
  }

  async count(where?: Record<string, unknown>): Promise<number> {
    return this.model.count({ where } as Record<string, unknown>) as Promise<number>;
  }

  async exists(where: Record<string, unknown>): Promise<boolean> {
    const count = await (this.model.count({ where } as Record<string, unknown>) as Promise<number>);
    return count > 0;
  }

  async transaction<R>(fn: (tx: Parameters<Parameters<typeof db.$transaction>[0]>[0]) => Promise<R>): Promise<R> {
    return db.$transaction(fn);
  }
}
