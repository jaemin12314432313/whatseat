import { NextResponse } from "next/server";

/**
 * api-spec.md §1.2 — 공통 에러 코드
 */
export type ApiErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "VOTE_CLOSED"
  | "ALREADY_CLOSED";

export interface ApiErrorBody {
  error: {
    code: ApiErrorCode;
    message: string;
  };
}

export function statusForApiError(code: ApiErrorCode): number {
  switch (code) {
    case "UNAUTHORIZED":
      return 401;
    case "FORBIDDEN":
      return 403;
    case "NOT_FOUND":
      return 404;
    case "VALIDATION_ERROR":
      return 400;
    case "VOTE_CLOSED":
    case "ALREADY_CLOSED":
      return 409;
    default: {
      const _exhaustive: never = code;
      return _exhaustive;
    }
  }
}

export function jsonError(
  code: ApiErrorCode,
  message: string,
  status?: number,
): NextResponse<ApiErrorBody> {
  return NextResponse.json(
    { error: { code, message } },
    { status: status ?? statusForApiError(code) },
  );
}

export function isUniqueViolation(error: { code?: string } | null): boolean {
  return error?.code === "23505";
}
