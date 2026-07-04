import { apiMutate } from "../api/api-client";

export async function deleteAccount(password: string): Promise<void> {
  await apiMutate<void>("/api/v1/me/account", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ account: { password } }),
  });
}
