import { validateInitialPassword } from '../../prisma/seed-password-policy';

describe('seed password policy', () => {
  it('rejects missing password', () => {
    expect(() =>
      validateInitialPassword({ password: undefined, envName: 'SEED_ADMIN_PASSWORD' })
    ).toThrow();
  });

  it('rejects blocked default password', () => {
    expect(() =>
      validateInitialPassword({ password: 'Admin@123', envName: 'SEED_ADMIN_PASSWORD' })
    ).toThrow('senha proibida');
  });

  it('rejects weak password', () => {
    expect(() =>
      validateInitialPassword({ password: 'weakpassword', envName: 'SEED_ADMIN_PASSWORD' })
    ).toThrow('maiuscula');
  });

  it('accepts strong password', () => {
    expect(
      validateInitialPassword({
        password: 'F0rte_Senha_Seed_2026!',
        envName: 'SEED_ADMIN_PASSWORD'
      })
    ).toBe('F0rte_Senha_Seed_2026!');
  });
});
