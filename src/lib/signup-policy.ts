export const PUBLIC_SIGNUP_DISABLED_ERROR =
  "Public sign up is disabled. Please request a coach meeting.";

export function canUsePublicSignup(bootstrapAdmin: boolean): boolean {
  return bootstrapAdmin;
}
