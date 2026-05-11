const DEFAULT_BLOCKLIST = new Set(['Admin@123', 'Tech@123', 'admin123', 'password', '123456']);

export function validateInitialPassword(input: {
  password: string | undefined;
  envName: string;
  envValue?: string;
}): string {
  const { password, envName } = input;
  if (!password) {
    throw new Error(`${envName} obrigatoria`);
  }

  if (DEFAULT_BLOCKLIST.has(password)) {
    throw new Error(`${envName} usa senha proibida`);
  }

  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  if (password.length < 12 || !hasUpper || !hasLower || !hasDigit || !hasSpecial) {
    throw new Error(
      `${envName} deve ter no minimo 12 caracteres com maiuscula, minuscula, numero e simbolo`
    );
  }

  return password;
}
