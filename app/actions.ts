"use server";

import { revalidatePath } from "next/cache";
import { Resource } from "@/lib/types";
import { getDefaultStore } from "@/lib/resource-store";

export async function getResources(): Promise<Resource[]> {
  return getDefaultStore().list();
}

export async function addResourceAction(
  prevState: { success: boolean; error?: string } | null,
  formData: FormData,
) {
  const title = formData.get("title")?.toString().trim();
  const description = formData.get("description")?.toString().trim() || "No description yet.";
  const category = formData.get("category")?.toString().trim() as Resource["category"];
  const tagsString = formData.get("tags")?.toString().trim() || "";
  const link = formData.get("link")?.toString().trim();
  const image = formData.get("image")?.toString().trim();
  const id = formData.get("id")?.toString().trim();

  const tags = tagsString
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  const result = await getDefaultStore().add({
    id: id || undefined,
    title: title || "",
    description,
    category: category || "example",
    tags,
    link: link || "",
    image: image || "",
  });

  if (!result.ok) {
    return { success: false, error: result.error };
  }

  revalidatePath("/");
  return { success: true, id: result.resource.id, duplicate: result.duplicate };
}

export async function updateResourceAction(
  id: string,
  patch: Partial<Omit<Resource, "id">>,
): Promise<{ success: boolean; error?: string }> {
  const result = await getDefaultStore().update(id, patch);
  if (!result.ok) return { success: false, error: result.error };
  revalidatePath("/");
  return { success: true };
}

export async function deleteResourceAction(id: string) {
  const result = await getDefaultStore().remove(id);
  if (!result.ok) {
    throw new Error(result.error);
  }
  revalidatePath("/");
  return { success: true, resource: result.resource };
}

export async function restoreResourceAction(resource: Resource) {
  const result = await getDefaultStore().add(resource);
  if (!result.ok) return { success: false, error: result.error };
  revalidatePath("/");
  return { success: true, resource: result.resource };
}

export async function addResourceDirect(newRes: Omit<Resource, "id" | "addedAt"> & { id?: string }): Promise<Resource> {
  const result = await getDefaultStore().add(newRes);
  if (!result.ok) {
    throw new Error(result.error);
  }
  revalidatePath("/");
  return result.resource;
}

export async function importResourcesAction(
  incoming: Array<Partial<Resource> & { title?: string; link?: string }>,
) {
  const result = await getDefaultStore().importAll(incoming);
  revalidatePath("/");
  return { success: true, ...result };
}

export async function resetGardenAction() {
  if (process.env.E2E_GARDEN_RESET !== "1") {
    return { success: false, error: "Garden reset is disabled" };
  }
  await getDefaultStore().reset();
  revalidatePath("/");
  return { success: true };
}
