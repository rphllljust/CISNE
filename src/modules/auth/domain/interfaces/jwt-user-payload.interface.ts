export interface JwtUserPayload {
  sub: string;
  email: string;
  fullName: string;
  status: string;
  roles: string[];
  permissions: string[];
}
