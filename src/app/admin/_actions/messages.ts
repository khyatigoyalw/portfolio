"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { check, guarded } from "./guard";

const Id = z.string().uuid();
const Status = z.enum(["new", "read", "archived"]);

function refresh() {
  revalidatePath("/admin/messages");
  revalidatePath("/admin");
}

export async function setMessageStatus(id: unknown, status: unknown) {
  return guarded(async (db) => {
    const s = Status.parse(status);
    const { error } = await db.from("contact_messages").update({ status: s }).eq("id", Id.parse(id));
    check(error, "Updating message");
    refresh();
    return { message: `Marked ${s}.` };
  });
}

export async function deleteMessage(id: unknown) {
  return guarded(async (db) => {
    const { error } = await db.from("contact_messages").delete().eq("id", Id.parse(id));
    check(error, "Deleting message");
    refresh();
    return { message: "Deleted." };
  });
}
