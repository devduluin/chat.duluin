import type { WsHandlerContext } from "../../types";
import { handleLegacySystemDelete } from "./membership/legacySystemDelete";
import { handleMemberAdded } from "./membership/memberAdded";
import { handleMemberExit } from "./membership/memberExit";
import { handleMemberRemoved } from "./membership/memberRemoved";
import { handleMemberRoleChange } from "./membership/memberRoleChange";

export function handleGroupMembership(
  msg: Message,
  messageType: string,
  ctx: WsHandlerContext,
): boolean {
  if (messageType !== "system") return false;
  if (handleLegacySystemDelete(msg)) return true;
  if (handleMemberAdded(msg, ctx)) return true;
  if (handleMemberExit(msg, ctx)) return true;
  if (handleMemberRemoved(msg, ctx)) return true;
  if (handleMemberRoleChange(msg, ctx)) return true;
  return false;
}
