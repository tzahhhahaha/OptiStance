export type UserRole = 'SystemManager' | 'Athlete';

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  passwordHash: string;
  createdAt: string;
}

export interface Motion {
  id: string;
  motionName: string;
  minShoulderAngle: number;
  maxShoulderAngle: number;
  minElbowAngle: number;
  maxElbowAngle: number;
  description: string;
}

export interface PracticeSession {
  id: string;
  userId: string;
  sessionDate: string;
  averageScore: number;
}

export interface SessionLog {
  id: string;
  sessionId: string;
  motionId: string;
  score: number;
  feedbackDetails: string;
}

export interface SavePracticeSessionPayload {
  userId: string;
  sessionDate: string;
  averageScore: number;
  logs: Array<{
    motionId: string;
    score: number;
    feedbackDetails: string;
  }>;
}

const USERS_KEY = 'optistance-users';
const MOTIONS_KEY = 'optistance-motions';
const SESSIONS_KEY = 'optistance-sessions';
const LOGS_KEY = 'optistance-logs';

const createId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
const toStoredHash = (password: string) => `demo:${password.trim()}`;

const readStorage = <T,>(key: string, fallback: T): T => {
  if (typeof window === 'undefined') return fallback;
  const raw = window.localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const writeStorage = <T,>(key: string, value: T) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, JSON.stringify(value));
};

const ensureSeedData = () => {
  const existingUsers = readStorage<User[]>(USERS_KEY, []);
  if (existingUsers.length === 0) {
    const seedUsers: User[] = [
      {
        id: createId('user'),
        fullName: 'System Manager',
        email: 'admin@optistance.com',
        role: 'SystemManager',
        passwordHash: toStoredHash('OptiStance2026!'),
        createdAt: new Date().toISOString(),
      },
      {
        id: createId('user'),
        fullName: 'Mia Rivera',
        email: 'athlete@optistance.com',
        role: 'Athlete',
        passwordHash: toStoredHash('athlete123'),
        createdAt: new Date().toISOString(),
      },
    ];
    writeStorage(USERS_KEY, seedUsers);
  }

  const existingMotions = readStorage<Motion[]>(MOTIONS_KEY, []);
  if (existingMotions.length === 0) {
    const seedMotions: Motion[] = [
      {
        id: createId('motion'),
        motionName: 'High V',
        minShoulderAngle: 110,
        maxShoulderAngle: 160,
        minElbowAngle: 120,
        maxElbowAngle: 180,
        description: 'Arms lifted into a strong high V with relaxed shoulders.',
      },
      {
        id: createId('motion'),
        motionName: 'Low V',
        minShoulderAngle: 90,
        maxShoulderAngle: 140,
        minElbowAngle: 100,
        maxElbowAngle: 170,
        description: 'Arms open into a lower, more grounded V shape.',
      },
      {
        id: createId('motion'),
        motionName: 'T-Motion',
        minShoulderAngle: 130,
        maxShoulderAngle: 180,
        minElbowAngle: 140,
        maxElbowAngle: 180,
        description: 'Arms form a straight horizontal line at shoulder height.',
      },
    ];
    writeStorage(MOTIONS_KEY, seedMotions);
  }
};

export const loginUser = async (email: string, password: string): Promise<User> => {
  ensureSeedData();
  const users = readStorage<User[]>(USERS_KEY, []);
  const normalizedEmail = email.trim().toLowerCase();
  const foundUser = users.find((user) => user.email.toLowerCase() === normalizedEmail);

  if (!foundUser || foundUser.passwordHash !== toStoredHash(password)) {
    throw new Error('Invalid email or password.');
  }

  return foundUser;
};

export const getUsers = async (): Promise<User[]> => {
  ensureSeedData();
  return readStorage<User[]>(USERS_KEY, []);
};

export const createAthlete = async (fullName: string, email: string, password: string): Promise<User> => {
  ensureSeedData();
  const users = readStorage<User[]>(USERS_KEY, []);
  const existing = users.find((user) => user.email.toLowerCase() === email.trim().toLowerCase());
  if (existing) {
    throw new Error('An account with that email already exists.');
  }

  const newUser: User = {
    id: createId('user'),
    fullName: fullName.trim(),
    email: email.trim(),
    role: 'Athlete',
    passwordHash: toStoredHash(password || 'optistance123'),
    createdAt: new Date().toISOString(),
  };

  const nextUsers = [...users, newUser];
  writeStorage(USERS_KEY, nextUsers);
  return newUser;
};

export const deleteUser = async (userId: string): Promise<void> => {
  ensureSeedData();
  const users = readStorage<User[]>(USERS_KEY, []);
  writeStorage(USERS_KEY, users.filter((user) => user.id !== userId));
};

export const getMotions = async (): Promise<Motion[]> => {
  ensureSeedData();
  return readStorage<Motion[]>(MOTIONS_KEY, []);
};

export const updateMotionThresholds = async (
  motionId: string,
  updates: Partial<Pick<Motion, 'minShoulderAngle' | 'maxShoulderAngle' | 'minElbowAngle' | 'maxElbowAngle' | 'description'>>,
): Promise<Motion> => {
  ensureSeedData();
  const motions = readStorage<Motion[]>(MOTIONS_KEY, []);
  const nextMotions = motions.map((motion) => (motion.id === motionId ? { ...motion, ...updates } : motion));
  writeStorage(MOTIONS_KEY, nextMotions);
  const updatedMotion = nextMotions.find((motion) => motion.id === motionId);
  if (!updatedMotion) throw new Error('Motion not found.');
  return updatedMotion;
};

export const savePracticeSession = async (payload: SavePracticeSessionPayload): Promise<PracticeSession> => {
  ensureSeedData();
  const sessions = readStorage<PracticeSession[]>(SESSIONS_KEY, []);
  const logs = readStorage<SessionLog[]>(LOGS_KEY, []);
  const newSession: PracticeSession = {
    id: createId('session'),
    userId: payload.userId,
    sessionDate: payload.sessionDate,
    averageScore: payload.averageScore,
  };
  const nextSessions = [...sessions, newSession];
  writeStorage(SESSIONS_KEY, nextSessions);

  const nextLogs = payload.logs.map((entry) => ({
    id: createId('log'),
    sessionId: newSession.id,
    motionId: entry.motionId,
    score: entry.score,
    feedbackDetails: entry.feedbackDetails,
  }));
  writeStorage(LOGS_KEY, [...logs, ...nextLogs]);
  return newSession;
};

// --- Admin helper methods (localStorage-backed) ---
export interface UserUpdate {
  fullName?: string;
  email?: string;
  role?: UserRole;
  password?: string;
  isActive?: boolean;
}

export const createUser = async (
  fullName: string,
  email: string,
  password: string,
  role: UserRole,
): Promise<User> => {
  ensureSeedData();
  const users = readStorage<User[]>(USERS_KEY, []);
  const existing = users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
  if (existing) throw new Error('An account with that email already exists.');
  const newUser: User = {
    id: createId('user'),
    fullName: fullName.trim(),
    email: email.trim(),
    role,
    passwordHash: toStoredHash(password || 'optistance123'),
    createdAt: new Date().toISOString(),
  };
  writeStorage(USERS_KEY, [...users, newUser]);
  return newUser;
};

export const updateUser = async (userId: string, updates: UserUpdate): Promise<User> => {
  ensureSeedData();
  const users = readStorage<User[]>(USERS_KEY, []);
  const next = users.map((u) => {
    if (u.id !== userId) return u;
    const out: any = { ...u };
    if (updates.fullName) out.fullName = updates.fullName;
    if (updates.email) out.email = updates.email;
    if (updates.role) out.role = updates.role;
    if (typeof updates.password === 'string') out.passwordHash = toStoredHash(updates.password);
    if (typeof updates.isActive === 'boolean') out.isActive = updates.isActive;
    return out as User;
  });
  writeStorage(USERS_KEY, next);
  const found = next.find((u) => u.id === userId)!;
  return found;
};

export const toggleUserActive = async (userId: string): Promise<User> => {
  ensureSeedData();
  const users = readStorage<User[]>(USERS_KEY, []);
  const next = users.map((u) => (u.id === userId ? { ...u, isActive: !(u as any).isActive } : u));
  writeStorage(USERS_KEY, next);
  return next.find((u) => u.id === userId)!;
};

export const resetPassword = async (userId: string, newPassword: string): Promise<void> => {
  ensureSeedData();
  const users = readStorage<User[]>(USERS_KEY, []);
  const next = users.map((u) => (u.id === userId ? { ...u, passwordHash: toStoredHash(newPassword) } : u));
  writeStorage(USERS_KEY, next);
};

export const getSessionsForUser = async (userId: string) => {
  ensureSeedData();
  const sessions = readStorage<PracticeSession[]>(SESSIONS_KEY, []);
  return sessions.filter((s) => s.userId === userId);
};

export const getLogsForSession = async (sessionId: string) => {
  ensureSeedData();
  const logs = readStorage<SessionLog[]>(LOGS_KEY, []);
  return logs.filter((l) => l.sessionId === sessionId);
};
