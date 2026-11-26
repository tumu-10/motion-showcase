import { detectNetwork, normalizeUgPhone } from "@/lib/rent";
import { isDemoMode } from "@/lib/demo-mode";
import type { AuthErrorCode } from "./strings";

export type AuthRole = "tenant" | "landlord" | "admin";
export type LandlordRole = "owner" | "manager";

export type AuthSession = {
  userId: string;
  phone: string;
  role: AuthRole;
  landlordStatus?: "in_progress" | "under_review" | "verified";
  adminStepVerified: boolean;
  lastActivityAt: number;
};

export type InviteSummary = {
  code: string;
  landlordName: string;
  propertyName: string;
  unitName: string;
};

export type LandlordOnboarding = {
  currentStep: number;
  name: string;
  role: LandlordRole | "";
  propertyName: string;
  unitCount: string;
  idFileName: string;
  proofFileName: string;
  payoutMethod: "mobile-money" | "bank" | "";
  payoutName: string;
  payoutPhone: string;
  bankName: string;
  bankAccountNumber: string;
  status: "in_progress" | "under_review";
};

export type LandlordOnboardingFiles = {
  idFile: File | null;
  proofFile: File | null;
};

type MockUser = {
  id: string;
  phone: string;
  role: AuthRole;
  pin: string;
  landlordStatus?: AuthSession["landlordStatus"];
};

export type AuthService = {
  requestCode(phone: string): Promise<{ returningUser: boolean }>;
  verifyCode(phone: string, code: string): Promise<{ returningUser: boolean }>;
  setPin(pin: string): Promise<AuthSession>;
  loginWithPin(phone: string, pin: string): Promise<AuthSession>;
  logout(): Promise<void>;
  getSession(): AuthSession | null;
  resetPin(phone: string): Promise<void>;
  hasAccount(phone: string): boolean;
  prepareSignup(phone: string, role: AuthRole, inviteCode?: string): Promise<void>;
  getInvite(code: string): InviteSummary | null;
  saveOnboarding(patch: Partial<LandlordOnboarding>): LandlordOnboarding;
  getOnboarding(): LandlordOnboarding;
  saveOnboardingFiles(patch: Partial<LandlordOnboardingFiles>): LandlordOnboardingFiles;
  getOnboardingFiles(): LandlordOnboardingFiles;
  finishOnboarding(): AuthSession;
  touchSession(): void;
  completeAdminVerification(): AuthSession;
  updatePhone(phone: string): Promise<AuthSession>;
  requestAccountDeletion(): Promise<void>;
};

export class AuthServiceError extends Error {
  constructor(public readonly code: AuthErrorCode) {
    super(code);
    this.name = "AuthServiceError";
  }
}

const LOCKOUT_MS = 15 * 60 * 1000;
const CODE_TTL_MS = 5 * 60 * 1000;
const RESEND_DELAY_MS = 30 * 1000;
const DEMO_CODE = "123456";
const EMPTY_ONBOARDING: LandlordOnboarding = {
  currentStep: 1,
  name: "",
  role: "",
  propertyName: "",
  unitCount: "",
  idFileName: "",
  proofFileName: "",
  payoutMethod: "",
  payoutName: "",
  payoutPhone: "",
  bankName: "",
  bankAccountNumber: "",
  status: "in_progress",
};

const demoInvites: Record<string, InviteSummary> = {
  "KOL-101": {
    code: "KOL-101",
    landlordName: "Patricia Auma",
    propertyName: "Kololo Heights",
    unitName: "Flat 3B",
  },
  "NTI-204": {
    code: "NTI-204",
    landlordName: "David Ssemanda",
    propertyName: "Ntinda Court",
    unitName: "Unit 204",
  },
};

function canonicalPhone(phone: string) {
  const digits = phone.replace(/[\s()-]/g, "");
  const input = /^7\d{8}$/.test(digits) ? `0${digits}` : digits;
  const local = normalizeUgPhone(input);
  if (!local || !detectNetwork(local)) throw new AuthServiceError("invalidPhone");
  return `+256${local.slice(1)}`;
}

function validatePin(pin: string) {
  if (!/^\d{4,6}$/.test(pin)) throw new AuthServiceError("invalidPin");
  if (/^(\d)\1+$/.test(pin) || ["1234", "12345", "123456", "4321", "654321"].includes(pin)) {
    throw new AuthServiceError("weakPin");
  }
}

function copySession(session: AuthSession | null) {
  return session ? { ...session } : null;
}

function createMockAuthService(): AuthService {
  const users = new Map<string, MockUser>();
  const requests = new Map<string, { sentAt: number; expiresAt: number; attempts: number }>();
  const codeLocks = new Map<string, number>();
  const pinAttempts = new Map<string, number>();
  const pinLocks = new Map<string, number>();
  const pendingSignup = new Map<string, { role: AuthRole; invite?: InviteSummary }>();
  let verifiedPhone: string | null = null;
  let pinResetPhone: string | null = null;
  let session: AuthSession | null = null;
  let onboarding = { ...EMPTY_ONBOARDING };
  let onboardingFiles: LandlordOnboardingFiles = { idFile: null, proofFile: null };
  let accountDeletionRequested = false;

  const demoUsers: MockUser[] = isDemoMode
    ? [
    {
      id: "demo-landlord",
      phone: "+256700000001",
      role: "landlord" as const,
      pin: "2468",
      landlordStatus: "under_review" as const,
    },
    { id: "demo-tenant", phone: "+256700000002", role: "tenant" as const, pin: "2468" },
    { id: "demo-admin", phone: "+256700000003", role: "admin" as const, pin: "2468" },
      ]
    : [];
  for (const user of demoUsers) {
    users.set(user.phone, user);
  }

  function getLock(locks: Map<string, number>, phone: string, error: "codeLocked" | "pinLocked") {
    const until = locks.get(phone);
    if (!until) return;
    if (Date.now() >= until) {
      locks.delete(phone);
      return;
    }
    throw new AuthServiceError(error);
  }

  function createSession(user: MockUser): AuthSession {
    session = {
      userId: user.id,
      phone: user.phone,
      role: user.role,
      ...(user.role === "landlord" ? { landlordStatus: user.landlordStatus ?? "in_progress" } : {}),
      adminStepVerified: user.role !== "admin",
      lastActivityAt: Date.now(),
    };
    return copySession(session)!;
  }

  async function requestCode(input: string) {
    const phone = canonicalPhone(input);
    getLock(codeLocks, phone, "codeLocked");
    const previous = requests.get(phone);
    if (previous && Date.now() - previous.sentAt < RESEND_DELAY_MS) {
      throw new AuthServiceError("waitToResend");
    }
    requests.set(phone, {
      sentAt: Date.now(),
      expiresAt: Date.now() + CODE_TTL_MS,
      attempts: previous?.attempts ?? 0,
    });
    return { returningUser: users.has(phone) };
  }

  return {
    requestCode,

    async verifyCode(input, code) {
      const phone = canonicalPhone(input);
      getLock(codeLocks, phone, "codeLocked");
      const request = requests.get(phone);
      if (!request || Date.now() > request.expiresAt) {
        throw new AuthServiceError("codeExpired");
      }
      if (!/^\d{6}$/.test(code) || code !== DEMO_CODE) {
        request.attempts += 1;
        if (request.attempts >= 5) {
          codeLocks.set(phone, Date.now() + LOCKOUT_MS);
          requests.delete(phone);
          throw new AuthServiceError("codeLocked");
        }
        throw new AuthServiceError("wrongCode");
      }
      verifiedPhone = phone;
      requests.delete(phone);
      return { returningUser: users.has(phone) };
    },

    async setPin(pin) {
      if (!verifiedPhone) throw new AuthServiceError("codeExpired");
      validatePin(pin);
      const phone = verifiedPhone;
      const user = users.get(phone);
      if (user && pinResetPhone === phone) {
        user.pin = pin;
        pinAttempts.delete(phone);
        pinLocks.delete(phone);
        pinResetPhone = null;
        pendingSignup.delete(phone);
        verifiedPhone = null;
        return createSession(user);
      }
      const signup = pendingSignup.get(phone);
      if (!signup) throw new AuthServiceError("inviteRequired");
      if (signup.role === "tenant" && !signup.invite) throw new AuthServiceError("inviteRequired");
      const created: MockUser = {
        id: `mock-${Date.now().toString(36)}`,
        phone,
        role: signup.role,
        pin,
        ...(signup.role === "landlord" ? { landlordStatus: "in_progress" as const } : {}),
      };
      users.set(phone, created);
      pendingSignup.delete(phone);
      verifiedPhone = null;
      onboarding = { ...EMPTY_ONBOARDING };
      return createSession(created);
    },

    async loginWithPin(input, pin) {
      const phone = canonicalPhone(input);
      getLock(pinLocks, phone, "pinLocked");
      const user = users.get(phone);
      if (!user || user.pin !== pin) {
        const attempts = (pinAttempts.get(phone) ?? 0) + 1;
        pinAttempts.set(phone, attempts);
        if (attempts >= 5) {
          pinLocks.set(phone, Date.now() + LOCKOUT_MS);
          pinAttempts.delete(phone);
          throw new AuthServiceError("pinLocked");
        }
        throw new AuthServiceError("wrongPin");
      }
      pinAttempts.delete(phone);
      pendingSignup.delete(phone);
      return createSession(user);
    },

    async logout() {
      session = null;
      verifiedPhone = null;
      pinResetPhone = null;
    },

    getSession() {
      if (
        session &&
        (session.role === "landlord" || session.role === "admin") &&
        Date.now() - session.lastActivityAt >= 30 * 60 * 1000
      ) {
        session = null;
      }
      return copySession(session);
    },

    async resetPin(input) {
      const phone = canonicalPhone(input);
      if (!users.has(phone)) throw new AuthServiceError("noAccount");
      pinResetPhone = phone;
      await requestCode(phone);
    },

    hasAccount(input) {
      try {
        return users.has(canonicalPhone(input));
      } catch {
        return false;
      }
    },

    async prepareSignup(input, role, inviteCode) {
      const phone = canonicalPhone(input);
      if (role === "tenant") {
        const invite = inviteCode ? this.getInvite(inviteCode) : null;
        if (!invite) throw new AuthServiceError("inviteRequired");
        pendingSignup.set(phone, { role, invite });
        return;
      }
      pendingSignup.set(phone, { role });
    },

    getInvite(code) {
      if (!isDemoMode) return null;
      return demoInvites[code.trim().toUpperCase()] ?? null;
    },

    saveOnboarding(patch) {
      onboarding = { ...onboarding, ...patch };
      return { ...onboarding };
    },

    getOnboarding() {
      return { ...onboarding };
    },

    saveOnboardingFiles(patch) {
      onboardingFiles = { ...onboardingFiles, ...patch };
      return { ...onboardingFiles };
    },

    getOnboardingFiles() {
      return { ...onboardingFiles };
    },

    finishOnboarding() {
      if (!session || session.role !== "landlord") throw new AuthServiceError("sessionRequired");
      onboarding = { ...onboarding, status: "under_review", currentStep: 5 };
      session.landlordStatus = "under_review";
      return copySession(session)!;
    },

    touchSession() {
      if (session) session.lastActivityAt = Date.now();
    },

    completeAdminVerification() {
      if (!session || session.role !== "admin") throw new AuthServiceError("notAdmin");
      session.adminStepVerified = true;
      session.lastActivityAt = Date.now();
      return copySession(session)!;
    },

    async updatePhone(input) {
      const phone = canonicalPhone(input);
      if (!session || !verifiedPhone || verifiedPhone !== phone) {
        throw new AuthServiceError("codeExpired");
      }
      if (users.has(phone)) throw new AuthServiceError("phoneInUse");
      const user = users.get(session.phone);
      if (!user) throw new AuthServiceError("sessionRequired");
      users.delete(session.phone);
      user.phone = phone;
      users.set(phone, user);
      session.phone = phone;
      verifiedPhone = null;
      return copySession(session)!;
    },

    async requestAccountDeletion() {
      if (!session) throw new AuthServiceError("sessionRequired");
      accountDeletionRequested = true;
    },
  };
}

export const authService = createMockAuthService();

export function normalizeAuthPhone(phone: string) {
  try {
    return canonicalPhone(phone);
  } catch {
    return null;
  }
}

export function formatAuthPhone(phone: string) {
  const canonical = canonicalPhone(phone);
  return `+256 ${canonical.slice(4, 7)} ${canonical.slice(7, 10)} ${canonical.slice(10)}`;
}

export const authDemoCode = isDemoMode ? DEMO_CODE : null;
