export type Photo = {
  id: string;
  storagePath: string;
  title: string;
  description: string | null;
  tags: string[];
  sortOrder: number;
  published: boolean;
  createdAt: string;
  updatedAt: string;
};
