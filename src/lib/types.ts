export type ProjectStatus = "Protected" | "Draft" | "Processing";

export type Project = {
  id: string;
  name: string;
  description: string;
  language: string;
  status: ProjectStatus;
  source_code?: string;
  protected_code?: string;
  updated_at: string;
  created_at?: string;
};

export type Deployment = {
  id: string;
  project_id: string;
  owner_id: string;
  label: string;
  endpoint: string | null;
  status: string;
  created_at: string;
  project?: { name: string } | null;
};

export type ApiKey = {
  id: string;
  name: string;
  key_prefix: string;
  last_used_at: string | null;
  created_at: string;
};
