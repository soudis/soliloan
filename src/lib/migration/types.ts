// dkp-v1 data package types

export interface Dkpv1Admin {
  id: number;
  logon_id: string;
  ldap: number;
  email: string;
  passwordHashed: string;
  lastLogin: string | null;
  loginCount: number;
  passwordResetToken: string | null;
  passwordResetExpires: string | null;
  savedViews: string;
  createdAt: string;
  updatedAt: string;
}

export interface Dkpv1User {
  id: number;
  logon_id: string;
  password: string;
  type: string;
  salutation: string | null;
  first_name: string;
  last_name: string;
  title_prefix: string;
  title_suffix: string;
  street: string;
  zip: string;
  place: string;
  country: string;
  telno: string | null;
  email: string;
  IBAN: string | null;
  BIC: string | null;
  account_notification_type: string;
  membership_status: string | null;
  relationship: string;
  passwordHashed: string;
  lastLogin: string | null;
  loginCount: number;
  passwordResetToken: string | null;
  passwordResetExpires: string | null;
  notes: string | null;
  notes_public: number;
  createdAt: string;
  updatedAt: string;
}

export interface Dkpv1Contract {
  id: number;
  user_id: number;
  sign_date: string | null;
  interest_payment_type: string | null;
  termination_type: string;
  termination_date: string | null;
  termination_period: number;
  termination_period_type: string | null;
  amount: number;
  interest_rate: number;
  interest_rate_type: string;
  interest_method: string | null;
  status: string;
  notes: string;
  notes_public: number;
  createdAt: string;
  updatedAt: string;
}

export interface Dkpv1Transaction {
  id: number;
  contract_id: number;
  type: string;
  transaction_date: string | null;
  amount: number | null;
  payment_type: string;
  createdAt: string;
  updatedAt: string;
}

export interface Dkpv1File {
  id: number;
  filename: string;
  description: string | null;
  salutation: string | null;
  mime: string;
  path: string;
  public: number;
  ref_id: number | null;
  ref_table: string;
  createdAt: string;
  updatedAt: string;
}

export interface Dkpv1DataPackage {
  admin: Dkpv1Admin[];
  user: Dkpv1User[];
  contract: Dkpv1Contract[];
  transaction: Dkpv1Transaction[];
  file: Dkpv1File[];
}

export interface Dkpv1ProjectInfoDefaults {
  interest_method?: string | null;
  interest_methods_alternative?: (string | null)[];
  country?: string;
  relationships?: string[];
}

export interface Dkpv1ProjectInfo {
  projectname: string;
  projectid: string;
  logo?: string;
  logo_select?: string;
  url?: string;
  email?: string;
  project_iban?: string;
  project_bic?: string;
  defaults?: Dkpv1ProjectInfoDefaults;
}

// Migration report types

export type MigrationWarningEntity = 'admin' | 'user' | 'contract' | 'transaction' | 'file' | 'note';

export interface MigrationWarning {
  entity: MigrationWarningEntity;
  legacyId: number | null;
  message: string;
}

export interface MigrationIdMapping {
  entity: string;
  legacyId: number;
  newId: string;
  displayNumber?: number;
}

export interface MigrationCounts {
  admins: number;
  lenders: number;
  loans: number;
  transactions: number;
  files: number;
  notes: number;
}

export interface MigrationReport {
  success: boolean;
  projectId: string | null;
  projectSlug: string | null;
  counts: MigrationCounts;
  warnings: MigrationWarning[];
  idMappings: MigrationIdMapping[];
  skippedFiles: number;
  unmappedFields: string[];
  error?: string;
}
