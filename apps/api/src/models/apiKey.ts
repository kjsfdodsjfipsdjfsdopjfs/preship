import type { ApiKey } from "@preship/shared";

/**
 * API Key model - represents an API key record in the database.
 * TODO: Implement with actual database queries (pg).
 */
export const ApiKeyModel = {
  async create(data: {
    id: string;
    userId: string;
    name: string;
    keyHash: string;
    prefix: string;
    expiresAt?: string;
  }): Promise<ApiKey> {
    // TODO: INSERT into api_keys table
    return {
      id: data.id,
      userId: data.userId,
      name: data.name,
      keyHash: data.keyHash,
      prefix: data.prefix,
      expiresAt: data.expiresAt,
      createdAt: new Date().toISOString(),
    };
  },

  async findByKeyHash(keyHash: string): Promise<ApiKey | null> {
    // TODO: SELECT from api_keys where key_hash = keyHash
    return null;
  },

  async listByUser(userId: string): Promise<ApiKey[]> {
    // TODO: SELECT from api_keys where user_id = userId
    return [];
  },

  async delete(id: string): Promise<void> {
    // TODO: DELETE from api_keys where id = id
  },
};
