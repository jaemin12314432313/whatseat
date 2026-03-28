/** `use server` 모듈은 async 함수만 export 가능해서 초기 상태는 여기 둠. */

export type LoginActionState = {
  error: string | null;
  success: string | null;
  showResend: boolean;
};

export const loginActionInitialState: LoginActionState = {
  error: null,
  success: null,
  showResend: false,
};
