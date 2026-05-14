/**
 * FILE: src/modules/auth/tests/auth.service.spec.ts
 * PURPOSE: Unit tests for AuthService — register, login, error cases.
 *
 * UNIT TEST PHILOSOPHY:
 * ─────────────────────────────────────────────────────────────
 * Unit tests test ONE unit (class/function) IN ISOLATION.
 * All external dependencies (DB, bcrypt, JWT) are MOCKED.
 *
 * WHY MOCK?
 * - Tests run fast (no DB connections)
 * - Tests are deterministic (no flaky network calls)
 * - Tests are focused (only testing service logic)
 *
 * PATTERN: Arrange → Act → Assert (AAA)
 * - Arrange: set up mocks and input data
 * - Act:     call the method under test
 * - Assert:  verify the expected outcome
 * ─────────────────────────────────────────────────────────────
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';
import { User, UserRole } from '../entities/user.entity';

// Mock the entire bcrypt module — required because bcrypt uses native bindings
// that cannot be spied on directly with jest.spyOn
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('$2b$10$hashedpassword'),
  compare: jest.fn(),
}));
import * as bcrypt from 'bcrypt';

// ── Mock Factory ────────────────────────────────────────────────────────────
/**
 * createMockRepository() returns a fake TypeORM repository.
 * We mock only the methods we actually use in the service.
 * jest.fn() creates a mock function that tracks calls and return values.
 */
const createMockRepository = () => ({
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  createQueryBuilder: jest.fn(),
});

const createMockJwtService = () => ({
  sign: jest.fn().mockReturnValue('mock.jwt.token'),
});

// ── Test Suite ───────────────────────────────────────────────────────────────
describe('AuthService', () => {
  let service: AuthService;
  let userRepository: ReturnType<typeof createMockRepository>;
  let jwtService: ReturnType<typeof createMockJwtService>;

  // Sample user fixture — reused across tests
  const mockUser: User = {
    id: 'uuid-123',
    email: 'test@warehouse.com',
    firstName: 'Test',
    lastName: 'User',
    password: '$2b$10$hashedpassword',
    role: UserRole.STAFF,
    isActive: true,
    deletedAt: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  /**
   * beforeEach runs before EVERY test.
   * Creates a fresh NestJS testing module with all dependencies mocked.
   * This ensures tests are isolated — one test cannot affect another.
   */
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          // Replace real TypeORM repository with our mock
          provide: getRepositoryToken(User),
          useValue: createMockRepository(),
        },
        {
          // Replace real JwtService with our mock
          provide: JwtService,
          useValue: createMockJwtService(),
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get(getRepositoryToken(User));
    jwtService = module.get(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks(); // Reset all mock call counts and return values
  });

  // ── register() tests ───────────────────────────────────────────────

  describe('register()', () => {
    const registerDto = {
      email: 'new@warehouse.com',
      firstName: 'New',
      lastName: 'User',
      password: 'Password123',
    };

    it('should create a new user and return user without password', async () => {
      // ARRANGE
      userRepository.findOne.mockResolvedValue(null); // email not taken
      userRepository.create.mockReturnValue({ ...mockUser, ...registerDto });
      userRepository.save.mockResolvedValue({ ...mockUser, ...registerDto });

      // ACT
      const result = await service.register(registerDto);

      // ASSERT
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: registerDto.email },
      });
      expect(userRepository.save).toHaveBeenCalledTimes(1);
      // CRITICAL: password must NOT be in the returned object
      expect(result).not.toHaveProperty('password');
      expect(result.email).toBe(registerDto.email);
    });

    it('should throw ConflictException if email already exists', async () => {
      // ARRANGE: simulate email already taken
      userRepository.findOne.mockResolvedValue(mockUser);

      // ASSERT: expect the specific exception to be thrown
      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );

      // Verify save was NEVER called — we should have stopped early
      expect(userRepository.save).not.toHaveBeenCalled();
    });

    it('should hash the password before saving', async () => {
      // ARRANGE
      userRepository.findOne.mockResolvedValue(null);
      userRepository.create.mockImplementation((data) => data);
      userRepository.save.mockImplementation((user) =>
        Promise.resolve({ ...user, id: 'new-uuid' }),
      );

      // ACT
      await service.register(registerDto);

      // ASSERT: bcrypt.hash must have been called with the plain password
      expect(bcrypt.hash).toHaveBeenCalledWith(
        registerDto.password,
        expect.any(Number),
      );
    });
  });

  // ── login() tests ──────────────────────────────────────────────────

  describe('login()', () => {
    const loginDto = {
      email: 'test@warehouse.com',
      password: 'plainPassword',
    };

    it('should return accessToken and user on valid credentials', async () => {
      // ARRANGE: mock the query builder chain for login
      const mockQB = {
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockUser),
      };
      userRepository.createQueryBuilder.mockReturnValue(mockQB);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      // ACT
      const result = await service.login(loginDto);

      // ASSERT
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('user');
      expect(result.user).not.toHaveProperty('password');
      expect(result.accessToken).toBe('mock.jwt.token');
    });

    it('should throw UnauthorizedException if user not found', async () => {
      // ARRANGE: user does not exist
      const mockQB = {
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };
      userRepository.createQueryBuilder.mockReturnValue(mockQB);

      // ASSERT
      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password is wrong', async () => {
      // ARRANGE
      const mockQB = {
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockUser),
      };
      userRepository.createQueryBuilder.mockReturnValue(mockQB);
      // bcrypt.compare returns false → wrong password
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      // ASSERT
      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });
  });
});
