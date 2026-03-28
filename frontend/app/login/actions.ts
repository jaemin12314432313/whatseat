"use server";

import { redirect } from "next/navigation";

import { getSiteUrlFromHeaders } from "@/lib/siteUrl";
import { createClient } from "@/lib/supabase/server";

import {
  type LoginActionState,
  loginActionInitialState,
} from "./loginActionState";

type AuthErrShape = {
  message?: string;
  msg?: string;
  code?: string | number;
  error_code?: string;
};

function textFromAuthError(err: AuthErrShape): string {
  const m = typeof err.message === "string" ? err.message.trim() : "";
  if (m) return m;
  const q = typeof err.msg === "string" ? err.msg.trim() : "";
  if (q) return q;
  try {
    return JSON.stringify(err);
  } catch {
    return "알 수 없는 오류";
  }
}

function isEmailNotConfirmed(err: AuthErrShape): boolean {
  const code = String(err.error_code ?? err.code ?? "").toLowerCase();
  const t = textFromAuthError(err).toLowerCase();
  return (
    code === "email_not_confirmed" ||
    t.includes("email not confirmed") ||
    t.includes("email address is not confirmed") ||
    t.includes("signup requires email confirmation")
  );
}

function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

function passwordAuthMessage(err: AuthErrShape): string {
  const code = String(err.error_code ?? err.code ?? "").toLowerCase();
  const msg = textFromAuthError(err).toLowerCase();

  if (isEmailNotConfirmed(err)) {
    return "이메일 인증이 필요해요. 메일함의 링크를 확인하거나 아래에서 인증 메일을 다시 보낼 수 있어요.";
  }
  if (
    code === "invalid_credentials" ||
    code === "invalid_grant" ||
    msg.includes("invalid login") ||
    msg.includes("invalid email or password")
  ) {
    return (
      "이메일 또는 비밀번호가 맞지 않거나, 가입 후 이메일 인증이 아직일 수 있어요. " +
      "메일함(스팸함)의 인증 링크를 확인해 보세요."
    );
  }
  if (
    code === "user_already_exists" ||
    msg.includes("user already registered") ||
    msg.includes("already been registered")
  ) {
    return "이미 가입된 이메일이에요. 「이메일로 로그인」을 눌러 주세요.";
  }
  if (msg.includes("password") && msg.includes("least")) {
    return "비밀번호 규칙을 만족하지 못했어요. 더 긴 비밀번호로 시도해 보세요.";
  }
  return textFromAuthError(err);
}

function nextFromForm(formData: FormData): string {
  const nextRaw = formData.get("next");
  const next =
    typeof nextRaw === "string" && nextRaw.startsWith("/") ? nextRaw : "/";
  return next;
}

function redirectAfterLogin(next: string) {
  const q = new URLSearchParams({ next });
  redirect(`/select-team?${q.toString()}`);
}

function validateEmailPassword(
  email: string,
  password: string,
): string | null {
  if (!email || !password) return "이메일과 비밀번호를 입력해 주세요.";
  if (password.length < 6) return "비밀번호는 6자 이상이어야 해요.";
  return null;
}

async function runSignIn(formData: FormData): Promise<LoginActionState> {
  const next = nextFromForm(formData);
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const password = String(formData.get("password") ?? "");
  const v = validateEmailPassword(email, password);
  if (v) {
    return { error: v, success: null, showResend: false };
  }

  const supabase = await createClient();
  const { error: err } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (err) {
    const code = String(err.code ?? "").toLowerCase();
    const looksWrongPassword =
      code === "invalid_credentials" ||
      code === "invalid_grant" ||
      textFromAuthError(err).toLowerCase().includes("invalid login");
    return {
      error: passwordAuthMessage(err),
      success: null,
      showResend: isEmailNotConfirmed(err) || looksWrongPassword,
    };
  }
  redirectAfterLogin(next);
}

async function runSignUp(formData: FormData): Promise<LoginActionState> {
  const next = nextFromForm(formData);
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const password = String(formData.get("password") ?? "");
  const v = validateEmailPassword(email, password);
  if (v) {
    return { error: v, success: null, showResend: false };
  }

  const siteUrl = await getSiteUrlFromHeaders();
  const callback = `${siteUrl}/auth/callback?next=${encodeURIComponent(next)}`;

  const supabase = await createClient();
  const { data, error: upErr } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: callback },
  });

  if (upErr) {
    return {
      error: passwordAuthMessage(upErr),
      success: null,
      showResend: isEmailNotConfirmed(upErr),
    };
  }

  if (data.session) {
    redirectAfterLogin(next);
  }

  const user = data.user;
  if (user && (!user.identities || user.identities.length === 0)) {
    return {
      error:
        "이미 가입된 이메일이에요. 비밀번호를 입력하고 「이메일로 로그인」을 눌러 주세요.",
      success: null,
      showResend: false,
    };
  }

  const identities = user?.identities ?? [];
  const hasEmailIdentity =
    identities.length > 0 && identities.some((i) => i.provider === "email");
  if (user && hasEmailIdentity && !user.email_confirmed_at) {
    return {
      error:
        "가입 메일을 보냈어요. 메일의 링크로 인증한 뒤 같은 비밀번호로 로그인해 주세요. (인증 전에는 비밀번호가 맞아도 로그인되지 않을 수 있어요.)",
      success: null,
      showResend: true,
    };
  }

  const trySignIn = () =>
    supabase.auth.signInWithPassword({ email, password });

  let { error: inErr } = await trySignIn();
  if (!inErr) {
    redirectAfterLogin(next);
  }
  await new Promise((r) => setTimeout(r, 400));
  const second = await trySignIn();
  inErr = second.error;
  if (!inErr) {
    redirectAfterLogin(next);
  }

  return {
    error: passwordAuthMessage(inErr),
    success: null,
    showResend: isEmailNotConfirmed(inErr),
  };
}

async function runResend(formData: FormData): Promise<LoginActionState> {
  const next = nextFromForm(formData);
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  if (!email) {
    return {
      error: "이메일을 입력한 뒤 다시 시도해 주세요.",
      success: null,
      showResend: true,
    };
  }

  const siteUrl = await getSiteUrlFromHeaders();
  const callback = `${siteUrl}/auth/callback?next=${encodeURIComponent(next)}`;

  const supabase = await createClient();
  const { error: err } = await supabase.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: callback },
  });

  if (err) {
    return {
      error: passwordAuthMessage(err),
      success: null,
      showResend: true,
    };
  }

  return {
    error: null,
    success: "인증 메일을 보냈어요. 메일함과 스팸함을 확인해 주세요.",
    showResend: false,
  };
}

export async function loginAuthAction(
  _prev: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const intent = formData.get("intent");
  if (intent === "signup") {
    return runSignUp(formData);
  }
  if (intent === "resend") {
    return runResend(formData);
  }
  if (intent === "signin") {
    return runSignIn(formData);
  }
  return loginActionInitialState;
}
