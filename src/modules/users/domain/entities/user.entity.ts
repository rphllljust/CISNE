export interface UserEntity {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  avatarUrl?: string;
  jobTitle?: string;
  department?: string;
  status: 'ACTIVE' | 'INACTIVE';
  roles: string[];
  teamIds: string[];
  createdAt: Date;
  updatedAt: Date;
}
