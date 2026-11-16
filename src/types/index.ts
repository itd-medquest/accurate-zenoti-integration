export type Actor = {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  createdAt?: string;
};

export type Branch = {
  id: string;
  name: string;
  centerId: string;
  accurateDatabaseId: string;
  accurateBranchId: string;
  active: boolean;
};
