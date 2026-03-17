import type { Project } from "@preship/shared";

/**
 * Project model - represents a project record in the database.
 * TODO: Implement with actual database queries (pg).
 */
export const ProjectModel = {
  async create(data: {
    id: string;
    name: string;
    url: string;
    userId: string;
  }): Promise<Project> {
    // TODO: INSERT into projects table
    return {
      id: data.id,
      name: data.name,
      url: data.url,
      userId: data.userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  },

  async findById(id: string): Promise<Project | null> {
    // TODO: SELECT from projects table
    return null;
  },

  async listByUser(userId: string): Promise<Project[]> {
    // TODO: SELECT from projects where user_id = userId
    return [];
  },

  async delete(id: string): Promise<void> {
    // TODO: Soft delete from projects table
  },
};
