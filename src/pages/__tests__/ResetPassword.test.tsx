import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ResetPassword from "../ResetPassword";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      getSession: () => Promise.resolve({ data: { session: null } }),
      updateUser: vi.fn(),
    },
  },
}));

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={["/forgot-password"]}>
      <ResetPassword />
    </MemoryRouter>
  );

describe("ResetPassword page", () => {
  it("renders the reset password heading", () => {
    renderPage();
    expect(screen.getByRole("heading", { name: /reset password/i })).toBeInTheDocument();
  });

  it("shows new password and confirm fields", () => {
    renderPage();
    expect(screen.getByLabelText(/^new password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm new password/i)).toBeInTheDocument();
  });

  it("renders the update password submit button", () => {
    renderPage();
    expect(screen.getByRole("button", { name: /update password/i })).toBeInTheDocument();
  });

  it("disables inputs until a recovery session is ready", () => {
    renderPage();
    expect(screen.getByLabelText(/^new password$/i)).toBeDisabled();
    expect(screen.getByRole("button", { name: /update password/i })).toBeDisabled();
  });
});

describe("/forgot-password remote smoke check", () => {
  const env = (globalThis as any).process?.env ?? {};
  const targets = [
    env.VITE_PREVIEW_URL,
    env.VITE_PRODUCTION_URL,
  ].filter(Boolean) as string[];

  if (targets.length === 0) {
    it.skip("set VITE_PREVIEW_URL and/or VITE_PRODUCTION_URL to enable remote checks", () => {});
    return;
  }

  it.each(targets)("loads %s/forgot-password", async (base) => {
    const res = await fetch(`${base.replace(/\/$/, "")}/forgot-password`);
    expect(res.status).toBeLessThan(500);
    const html = await res.text();
    expect(html).toMatch(/<div id="root">|<!doctype html>/i);
  }, 20000);
});