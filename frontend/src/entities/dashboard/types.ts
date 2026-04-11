export interface DashboardCards {
  totalOpen: number;
  totalInProgress: number;
  totalCompleted: number;
  totalCanceled: number;
  totalOverdue: number;
  avgStartMinutes: number;
  avgCompletionMinutes: number;
  slaComplied: number;
  slaViolated: number;
}

export interface DashboardOverview {
  cards: DashboardCards;
  charts: {
    byStatus: Array<{ status: string; total: number }>;
    byTechnician: Array<{ technicianId: string | null; technicianName: string; total: number }>;
    byClient: Array<{ clientId: string; clientName: string; total: number }>;
  };
}


