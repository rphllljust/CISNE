export interface JwtUserPayload {
  sub: string;
  email: string;
  fullName: string;
  status: string;
  mustChangePassword?: boolean;
  roles: string[];
  permissions: string[];
}
