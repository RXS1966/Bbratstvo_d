import { apiFetch } from "@/lib/api";

export type SectionResponse = {
  id: string;
  title: string;
  description: string;
  status: string;
  message: string;
};

export async function fetchSection(
  sectionId: string,
  token: string
): Promise<SectionResponse> {
  return apiFetch<SectionResponse>(`/api/sections/${sectionId}`, { token });
}
