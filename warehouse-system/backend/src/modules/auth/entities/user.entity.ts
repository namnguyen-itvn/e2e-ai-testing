/**
 * FILE: src/modules/auth/entities/user.entity.ts
 * PURPOSE: User table — stores credentials and role for authentication.
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
} from 'typeorm';

export enum UserRole {
  ADMIN = 'admin',           // Full access
  WAREHOUSE_MANAGER = 'warehouse_manager', // Manage stock, products
  STAFF = 'staff',           // View and basic operations
  AUDITOR = 'auditor',       // Read-only access for compliance
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column({ type: 'varchar', length: 100 })
  firstName: string;

  @Column({ type: 'varchar', length: 100 })
  lastName: string;

  /**
   * Password is stored as a bcrypt hash — NEVER plain text.
   * select: false → password is excluded from all SELECT queries by default.
   * You must explicitly request it with { select: ['password'] } when needed.
   */
  @Column({ type: 'varchar', select: false })
  password: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.STAFF })
  role: UserRole;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
