export interface Resource {
  id: string;
  title: string;
  description: string;
  category: "official" | "example" | "tutorial" | "repo" | "pattern";
  tags: string[];
  link: string;
  image: string;
  addedAt: string;
}
