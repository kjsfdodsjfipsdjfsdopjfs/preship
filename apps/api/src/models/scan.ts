import type { ScanResult, ScanStatus } from "@preship/shared";

/**
 * Scan model - represents a scan record in the database.
 * TODO: Implement with actual database queries (pg).
 */
export interface ScanRecord {
  id: string;
  project_id: string | null;
  user_id: string;
  url: string;
  status: ScanStatus;
  result: ScanResult | null;
  created_at: Date;
  completed_at: Date | null;
}

export const ScanModel = {
  async create(data: {
    id: string;
    userId: string;
    url: string;
    projectId?: string;
  }): Promise<ScanRecord> {
    // TODO: INSERT into scans table
    return {
      id: data.id,
      project_id: data.projectId || null,
      user_id: data.userId,
      url: data.url,
      status: "pending",
      result: null,
      created_at: new Date(),
      completed_at: null,
    };
  },

  async findById(id: string): Promise<ScanRecord | null> {
    // TODO: SELECT from scans table
    return null;
  },

  async updateStatus(
    id: string,
    status: ScanStatus,
    result?: ScanResult
  ): Promise<void> {
    // TODO: UPDATE scans table
  },

  async listByUser(
    userId: string,
    options: { page: number; limit: number; projectId?: string }
  ): Promise<{ data: ScanRecord[]; total: number }> {
    // TODO: SELECT from scans with pagination
    return { data: [], total: 0 };
  },
};
