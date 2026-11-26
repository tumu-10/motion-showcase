import { redirect } from "@tanstack/react-router";
import { authService, type AuthRole } from "./auth-service";
import { isDemoMode } from "@/lib/demo-mode";

function roleHome(role: AuthRole) {
  if (role === "admin") return "/admin";
  if (role === "landlord") {
    const session = authService.getSession();
    return session?.landlordStatus === "in_progress" ? "/onboarding/landlord" : "/landlord";
  }
  return "/tenant";
}

export function requireSession() {
  const session = authService.getSession();
  if (!session) {
    throw redirect({ to: "/login", search: { mode: "login", expired: false } });
  }
}

export function requireRole(role: AuthRole, { allowDemo = false } = {}) {
  const session = authService.getSession();
  if (allowDemo && isDemoMode && !session) return;
  if (!session) {
    throw redirect({ to: "/login", search: { mode: "login", expired: false } });
  }
  if (session.role !== role) {
    throw redirect({ href: roleHome(session.role) });
  }
  if (role === "admin" && !session.adminStepVerified) {
    throw redirect({ to: "/admin/verify" });
  }
}

export function requireAdminSecondStep() {
  const session = authService.getSession();
  if (!session) {
    throw redirect({ to: "/login", search: { mode: "login", expired: false } });
  }
  if (session.role !== "admin") {
    throw redirect({ href: roleHome(session.role) });
  }
  if (session.adminStepVerified) {
    throw redirect({ to: "/admin" });
  }
}
