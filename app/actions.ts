"use server";

import fs from "node:fs";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { Resource } from "@/lib/types";
import { isAllowedUrl } from "@/lib/security";

const DATA_FILE = path.join(process.cwd(), "resources.json");

const initialResources: Resource[] = [
  {
    id: "1",
    title: "React Three Fiber — Official Docs",
    description:
      "The single source of truth. Declarative, performant, and beautifully documented.",
    category: "official",
    tags: ["core", "react", "docs"],
    link: "https://docs.pmnd.rs/react-three-fiber",
    image: "https://picsum.photos/id/1015/800/450",
    addedAt: "2026-01-12",
  },
  {
    id: "2",
    title: "Anti-Gravity Racing Demo",
    description:
      "Beautiful example of vehicle physics + custom shaders in R3F. Perfect reference for track feel.",
    category: "example",
    tags: ["physics", "racing", "shaders"],
    link: "https://github.com/pmndrs/drei",
    image: "https://picsum.photos/id/1074/800/450",
    addedAt: "2026-02-03",
  },
  {
    id: "3",
    title: "Three.js Journey — Bruno Simon",
    description:
      "The best paid course on the planet for mastering Three.js fundamentals.",
    category: "tutorial",
    tags: ["course", "beginner", "bruno"],
    link: "https://threejs-journey.com/",
    image: "https://picsum.photos/id/106/800/450",
    addedAt: "2026-01-20",
  },
  {
    id: "4",
    title: "@react-three/drei",
    description:
      "Essential helpers, controls, and abstractions. You will use this every single day.",
    category: "repo",
    tags: ["helpers", "controls", "must-have"],
    link: "https://github.com/pmndrs/drei",
    image: "https://picsum.photos/id/160/800/450",
    addedAt: "2026-01-15",
  },
  {
    id: "5",
    title: "R3F Performance Patterns",
    description:
      "Advanced techniques for keeping 60fps even with thousands of objects.",
    category: "pattern",
    tags: ["performance", "optimization", "advanced"],
    link: "https://docs.pmnd.rs/react-three-fiber/advanced/performance",
    image: "https://picsum.photos/id/201/800/450",
    addedAt: "2026-02-10",
  },
];

export async function getResources(): Promise<Resource[]> {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, JSON.stringify(initialResources, null, 2), "utf-8");
      return initialResources;
    }
    const content = fs.readFileSync(DATA_FILE, "utf-8");
    return JSON.parse(content) as Resource[];
  } catch (error) {
    console.error("Error reading or initializing resources file:", error);
    return initialResources;
  }
}

async function saveResources(resources: Resource[]): Promise<boolean> {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(resources, null, 2), "utf-8");
    return true;
  } catch (error) {
    console.error("Error saving resources file:", error);
    return false;
  }
}

export async function addResourceAction(
  prevState: { success: boolean; error?: string } | null,
  formData: FormData
) {
  const title = formData.get("title")?.toString().trim();
  const description = formData.get("description")?.toString().trim() || "No description yet.";
  const category = formData.get("category")?.toString().trim() as Resource["category"];
  const tagsString = formData.get("tags")?.toString().trim() || "";
  const link = formData.get("link")?.toString().trim();
  const image = formData.get("image")?.toString().trim();

  if (!title || !link) {
    return { success: false, error: "Title and Link are required fields." };
  }

  if (!isAllowedUrl(link)) {
    return { success: false, error: "Link must be a valid http:// or https:// URL." };
  }

  if (image && !isAllowedUrl(image)) {
    return { success: false, error: "Image URL must be a valid http:// or https:// URL." };
  }

  const tags = tagsString
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  const newResource: Resource = {
    id: Date.now().toString(36),
    title,
    description,
    category: category || "example",
    tags: tags.length ? tags : ["new"],
    link,
    image: image || `https://picsum.photos/id/${Math.floor(Math.random() * 1000)}/800/450`,
    addedAt: new Date().toISOString().split("T")[0],
  };

  const current = await getResources();
  const updated = [newResource, ...current];
  const saved = await saveResources(updated);

  if (!saved) {
    return { success: false, error: "Failed to persist new resource on the server." };
  }

  revalidatePath("/");
  return { success: true };
}

export async function deleteResourceAction(id: string) {
  const current = await getResources();
  const updated = current.filter((r) => r.id !== id);
  const saved = await saveResources(updated);

  if (!saved) {
    throw new Error("Failed to delete resource on the server.");
  }

  revalidatePath("/");
  return { success: true };
}

export async function addResourceDirect(newRes: Omit<Resource, "id" | "addedAt">): Promise<Resource> {
  if (!isAllowedUrl(newRes.link)) {
    throw new Error("Resource link must use http or https scheme.");
  }
  if (!isAllowedUrl(newRes.image)) {
    throw new Error("Resource image must use http or https scheme.");
  }

  const resource: Resource = {
    ...newRes,
    id: Date.now().toString(36),
    addedAt: new Date().toISOString().split("T")[0],
  };

  const current = await getResources();
  const updated = [resource, ...current];
  const saved = await saveResources(updated);

  if (!saved) {
    throw new Error("Failed to save resource directly on the server.");
  }

  revalidatePath("/");
  return resource;
}

