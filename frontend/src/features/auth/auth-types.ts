export type UserRole = "intern" | "company";

export type CurrentUser = {
  id: number;
  email: string;
  role: UserRole;
  company: { id: number; name: string } | null;
};

export type ApiError = {
  code: string;
  field?: string;
  message: string;
};

export type ApiErrorResponse = {
  errors: ApiError[];
};

export type RegistrationInput = {
  role: UserRole;
  email: string;
  password: string;
  password_confirmation: string;
  company_name?: string;
};

export type LoginInput = {
  email: string;
  password: string;
};
