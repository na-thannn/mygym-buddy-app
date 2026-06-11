export function shouldRedirectForPasswordChange({
  mustChangePassword,
  pathname,
}: {
  mustChangePassword: boolean;
  pathname: string;
}): boolean {
  return mustChangePassword && pathname !== "/change-password";
}
