import { afterEach, describe, expect, it, vi } from "vitest";
import {
  authService,
  AuthServiceError,
  normalizeAuthPhone,
} from "@/lib/auth/auth-service";

describe("mock authentication service", () => {
  afterEach(async () => {
    vi.useRealTimers();
    await authService.logout();
  });

  it("normalizes Ugandan mobile numbers with 07xx and 7xx prefixes", () => {
    expect(normalizeAuthPhone("0772 123 456")).toBe("+256772123456");
    expect(normalizeAuthPhone("772123456")).toBe("+256772123456");
    expect(normalizeAuthPhone("+256 772 123 456")).toBe("+256772123456");
    expect(normalizeAuthPhone("0712 123 456")).toBeNull();
  });

  it("requires a tenant invite and verifies the demo code before setting a PIN", async () => {
    const phone = "+256772654321";
    await expect(authService.prepareSignup(phone, "tenant")).rejects.toMatchObject({
      code: "inviteRequired",
    });

    await authService.prepareSignup(phone, "tenant", "KOL-101");
    await authService.requestCode(phone);
    await authService.verifyCode(phone, "123456");
    await expect(authService.setPin("1234")).rejects.toMatchObject({ code: "weakPin" });
    await expect(authService.setPin("7777")).rejects.toMatchObject({ code: "weakPin" });

    const session = await authService.setPin("5728");
    expect(session).toMatchObject({ phone, role: "tenant" });
  });

  it("locks a code challenge after five failed attempts", async () => {
    const phone = "+256773111222";
    await authService.requestCode(phone);

    for (let attempt = 1; attempt < 5; attempt += 1) {
      await expect(authService.verifyCode(phone, "000000")).rejects.toMatchObject({
        code: "wrongCode",
      });
    }

    await expect(authService.verifyCode(phone, "000000")).rejects.toMatchObject({
      code: "codeLocked",
    });
    await expect(authService.requestCode(phone)).rejects.toMatchObject({
      code: "codeLocked",
    });
  });

  it("locks a returning account after five wrong PINs", async () => {
    const phone = "+256774111222";
    await authService.prepareSignup(phone, "landlord");
    await authService.requestCode(phone);
    await authService.verifyCode(phone, "123456");
    await authService.setPin("5729");

    for (let attempt = 1; attempt < 5; attempt += 1) {
      await expect(authService.loginWithPin(phone, "0000")).rejects.toMatchObject({
        code: "wrongPin",
      });
    }

    await expect(authService.loginWithPin(phone, "0000")).rejects.toMatchObject({
      code: "pinLocked",
    });
    await expect(authService.loginWithPin(phone, "5729")).rejects.toMatchObject({
      code: "pinLocked",
    });
  });

  it("releases a PIN lock after 15 minutes", async () => {
    const phone = "+256774111223";
    await authService.prepareSignup(phone, "landlord");
    await authService.requestCode(phone);
    await authService.verifyCode(phone, "123456");
    await authService.setPin("5729");

    vi.useFakeTimers();
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await expect(authService.loginWithPin(phone, "0000")).rejects.toBeInstanceOf(
        AuthServiceError,
      );
    }

    await expect(authService.loginWithPin(phone, "5729")).rejects.toMatchObject({
      code: "pinLocked",
    });
    vi.advanceTimersByTime(15 * 60 * 1000);
    await expect(authService.loginWithPin(phone, "5729")).resolves.toMatchObject({
      phone,
      role: "landlord",
    });
  });

  it("requests and accepts a code before changing a phone number", async () => {
    await authService.loginWithPin("+256700000002", "2468");
    const newPhone = "+256775222333";
    await authService.requestCode(newPhone);
    await authService.verifyCode(newPhone, "123456");
    const updated = await authService.updatePhone(newPhone);
    expect(updated.phone).toBe(newPhone);
  });
});
