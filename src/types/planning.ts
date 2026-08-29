export interface Category {
  id: string;
  clubId: string;
  name: string;
}

export interface Club {
  id: string;
  name: string;
  categories: Category[];
}

export interface TrainingSession {
  id: string;
  date: string;
  title: string;
}