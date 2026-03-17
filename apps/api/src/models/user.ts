import type { User } from "@preship/shared";

/**
 * User model - represents a user record in the database.
 * TODO: Implement with actual database queries (pg).
 */
export const UserModel = {
  async create(data: {
    id: string;
    email: string;
    name: string;
    passwordHash: string;
  }): Promise<User> {
    // TODO: INSERT into users table
    return {
      id: data.id,
      email: data.email,
      name: data.name,
      plan: "free",
      createdAt: new Date().toISOString(),
    };
  },

  async findByEmail(email: string): Promise<(User & { passwordHash: string }) | null> {
    // TODO: SELECT from users where email = email
    return null;
  },

  async findById(id: string): Promise<User | null> {
    // TODO: SELECT from users where id = id
    return null;
  },

  async updatePlan(id: string, plan: User["plan"], stripeCustomerId?: string): Promise<void> {
    // TODO: UPDATE users SET plan = plan
  },
};
