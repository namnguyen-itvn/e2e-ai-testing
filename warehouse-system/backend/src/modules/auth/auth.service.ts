/**
 * FILE: src/modules/auth/auth.service.ts
 * PURPOSE: Authentication business logic — register, login, token generation.
 */

import {
  Injectable,
  Logger,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  // bcrypt salt rounds — higher = more secure but slower
  // 10-12 is the industry standard. Never use < 10 in production.
  private readonly SALT_ROUNDS = 10;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    private readonly jwtService: JwtService,
  ) {}

  /**
   * REGISTER — Create a new user account.
   * Password is hashed with bcrypt before storage.
   */
  async register(dto: RegisterDto): Promise<Omit<User, 'password'>> {
    this.logger.log(`Registering new user: ${dto.email}`);

    // Check email not already taken
    const existing = await this.userRepository.findOne({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException(`Email "${dto.email}" is already registered`);
    }

    // Hash the password — NEVER store plain text passwords
    const hashedPassword = await bcrypt.hash(dto.password, this.SALT_ROUNDS);

    const user = this.userRepository.create({
      ...dto,
      password: hashedPassword,
    });

    const saved = await this.userRepository.save(user);

    // Return user without the password field
    const { password: _, ...result } = saved;
    return result;
  }

  /**
   * LOGIN — Validate credentials and issue JWT token.
   */
  async login(dto: LoginDto): Promise<{ accessToken: string; user: Partial<User> }> {
    this.logger.log(`Login attempt: ${dto.email}`);

    // Explicitly select password (it has select: false on entity)
    const user = await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', { email: dto.email })
      .andWhere('user.is_active = true')
      .getOne();

    if (!user) {
      // Use generic message — don't reveal whether email exists (security)
      throw new UnauthorizedException('Invalid email or password');
    }

    // Compare provided password with stored bcrypt hash
    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Generate JWT token
    const accessToken = this.generateToken(user);

    // Return token + user info (without password)
    const { password: _, ...userWithoutPassword } = user;

    this.logger.log(`Login successful: ${dto.email}`);
    return { accessToken, user: userWithoutPassword };
  }

  /**
   * Generate a signed JWT token.
   *
   * Payload contains: sub (user ID), email, role
   * The payload is ENCODED (not encrypted) — don't put sensitive data in it.
   */
  private generateToken(user: User): string {
    return this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
  }

  /**
   * GET PROFILE — Return current user's info from token.
   */
  async getProfile(userId: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id: userId } });
  }
}
