import { PrismaClient } from '@prisma/client';

import { createOrIgnore, populateAllWorkflows } from '../scripts/populate-all-workflows';

type PrismaMockBundle = {
  prisma: PrismaClient;
  mocks: {
    clientFindMany: jest.Mock;
    serviceTypeFindMany: jest.Mock;
    teamFindMany: jest.Mock;
    userFindMany: jest.Mock;
    slaFindMany: jest.Mock;
    contractFindMany: jest.Mock;
    assetCreate: jest.Mock;
    supplierCreate: jest.Mock;
    addressFindFirst: jest.Mock;
    serviceOrderCreate: jest.Mock;
    scheduleCreate: jest.Mock;
    serviceOrderFindMany: jest.Mock;
    invoiceCreate: jest.Mock;
    problemRecordCreate: jest.Mock;
    changeRequestCreate: jest.Mock;
    knowledgeArticleCreate: jest.Mock;
  };
};

const buildPrismaMock = (override?: Partial<PrismaMockBundle['mocks']>): PrismaMockBundle => {
  const clientFindMany =
    override?.clientFindMany ??
    jest.fn().mockResolvedValue([
      {
        id: 'client-1',
        name: 'Cliente 1'
      }
    ]);
  const serviceTypeFindMany =
    override?.serviceTypeFindMany ??
    jest.fn().mockResolvedValue([
      {
        id: 'service-type-1',
        name: 'Preventiva'
      }
    ]);
  const teamFindMany =
    override?.teamFindMany ??
    jest.fn().mockResolvedValue([
      {
        id: 'team-1',
        name: 'Equipe 1'
      }
    ]);
  const userFindMany =
    override?.userFindMany ??
    jest.fn().mockResolvedValue([
      {
        id: 'admin-1',
        email: 'admin@oms.local'
      },
      {
        id: 'tech-1',
        email: 'tech-1@oms.local'
      }
    ]);
  const slaFindMany =
    override?.slaFindMany ??
    jest.fn().mockResolvedValue([
      {
        id: 'sla-1'
      }
    ]);
  const contractFindMany =
    override?.contractFindMany ??
    jest.fn().mockResolvedValue([
      {
        id: 'contract-1',
        clientId: 'client-1'
      }
    ]);
  const assetCreate =
    override?.assetCreate ??
    jest.fn().mockImplementation(async ({ data }: { data: { code: string } }) => ({
      id: `asset-${data.code}`
    }));
  const supplierCreate =
    override?.supplierCreate ??
    jest.fn().mockResolvedValue({
      id: 'supplier-1'
    });
  const addressFindFirst =
    override?.addressFindFirst ??
    jest.fn().mockResolvedValue({
      id: 'address-1'
    });
  let serviceOrderSeq = 0;
  const serviceOrderCreate =
    override?.serviceOrderCreate ??
    jest.fn().mockImplementation(async () => ({
      id: `so-${++serviceOrderSeq}`
    }));
  const scheduleCreate =
    override?.scheduleCreate ??
    jest.fn().mockResolvedValue({
      id: 'schedule-1'
    });
  const serviceOrderFindMany =
    override?.serviceOrderFindMany ??
    jest.fn().mockResolvedValue([
      { id: 'so-completed-1', title: 'OS 1', invoice: null },
      { id: 'so-completed-2', title: 'OS 2', invoice: null },
      { id: 'so-completed-3', title: 'OS 3', invoice: null }
    ]);
  const invoiceCreate =
    override?.invoiceCreate ??
    jest.fn().mockResolvedValue({
      id: 'invoice-1'
    });
  const problemRecordCreate =
    override?.problemRecordCreate ??
    jest.fn().mockResolvedValue({
      id: 'problem-1'
    });
  const changeRequestCreate =
    override?.changeRequestCreate ??
    jest.fn().mockResolvedValue({
      id: 'change-1'
    });
  const knowledgeArticleCreate =
    override?.knowledgeArticleCreate ??
    jest.fn().mockResolvedValue({
      id: 'article-1'
    });

  const mocks: PrismaMockBundle['mocks'] = {
    clientFindMany,
    serviceTypeFindMany,
    teamFindMany,
    userFindMany,
    slaFindMany,
    contractFindMany,
    assetCreate,
    supplierCreate,
    addressFindFirst,
    serviceOrderCreate,
    scheduleCreate,
    serviceOrderFindMany,
    invoiceCreate,
    problemRecordCreate,
    changeRequestCreate,
    knowledgeArticleCreate
  };

  const prisma = {
    client: { findMany: clientFindMany },
    serviceType: { findMany: serviceTypeFindMany },
    team: { findMany: teamFindMany },
    user: { findMany: userFindMany },
    sLA: { findMany: slaFindMany },
    contract: { findMany: contractFindMany },
    asset: { create: assetCreate },
    supplier: { create: supplierCreate },
    address: { findFirst: addressFindFirst },
    serviceOrder: { create: serviceOrderCreate, findMany: serviceOrderFindMany },
    schedule: { create: scheduleCreate },
    invoice: { create: invoiceCreate },
    problemRecord: { create: problemRecordCreate },
    changeRequest: { create: changeRequestCreate },
    knowledgeArticle: { create: knowledgeArticleCreate }
  } as unknown as PrismaClient;

  return {
    prisma,
    mocks
  };
};

describe('populate-all-workflows script', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('createOrIgnore returns result when operation succeeds', async () => {
    const result = await createOrIgnore(async () => 'ok');
    expect(result).toBe('ok');
  });

  it('createOrIgnore returns null when Prisma unique error P2002 happens', async () => {
    const result = await createOrIgnore(async () => {
      throw { code: 'P2002' };
    });

    expect(result).toBeNull();
  });

  it('createOrIgnore rethrows non-P2002 errors', async () => {
    await expect(
      createOrIgnore(async () => {
        throw new Error('unexpected');
      })
    ).rejects.toThrow('unexpected');
  });

  it('returns null when there are no clients', async () => {
    const { prisma } = buildPrismaMock({
      clientFindMany: jest.fn().mockResolvedValue([])
    });

    const stats = await populateAllWorkflows(prisma);

    expect(stats).toBeNull();
  });

  it('returns null when required actors are missing', async () => {
    const { prisma } = buildPrismaMock({
      userFindMany: jest.fn().mockResolvedValue([
        {
          id: 'user-without-admin-and-tech',
          email: 'user@oms.local'
        }
      ])
    });

    const stats = await populateAllWorkflows(prisma);

    expect(stats).toBeNull();
  });

  it('creates workflow data with expected totals for one client', async () => {
    const { prisma, mocks } = buildPrismaMock();

    const stats = await populateAllWorkflows(prisma);

    expect(stats).toEqual({
      clients: 1,
      assets: 3,
      suppliers: 3,
      serviceOrders: 10,
      invoices: 3,
      problems: 3,
      changes: 3,
      articles: 5
    });
    expect(mocks.assetCreate).toHaveBeenCalledTimes(3);
    expect(mocks.supplierCreate).toHaveBeenCalledTimes(3);
    expect(mocks.serviceOrderCreate).toHaveBeenCalledTimes(10);
    expect(mocks.scheduleCreate).toHaveBeenCalledTimes(4);
    expect(mocks.invoiceCreate).toHaveBeenCalledTimes(3);
    expect(mocks.problemRecordCreate).toHaveBeenCalledTimes(3);
    expect(mocks.changeRequestCreate).toHaveBeenCalledTimes(3);
    expect(mocks.knowledgeArticleCreate).toHaveBeenCalledTimes(5);
  });
});
