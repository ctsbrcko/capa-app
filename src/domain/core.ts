export type Id = string;

export interface AppUser {
  id: Id;
  email: string | null;
  full_name: string | null;
  organization_id: Id | null;
}

export interface Role {
  id: Id;
  code: string;
  name: string;
}

