export type Photo = {
  id: string;
  cloudinaryPublicId: string;
  title: string;
  description: string | null;
  tags: string[];
  sortOrder: number;
  published: boolean;
  createdAt: string;
  updatedAt: string;
};
