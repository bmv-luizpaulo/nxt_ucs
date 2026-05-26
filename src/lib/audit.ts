import { Firestore, collection, addDoc } from "firebase/firestore";
import { AuditAction, AuditLog } from "./types";

interface WriteAuditLogOptions {
  targetId?: string;
  metadata?: Record<string, any>;
}

export async function writeAuditLog(
  firestore: Firestore,
  user: { email: string | null; displayName?: string | null },
  action: AuditAction,
  target: string,
  opts?: WriteAuditLogOptions
): Promise<void> {
  try {
    const log: Omit<AuditLog, "id"> = {
      timestamp: new Date().toISOString(),
      userEmail: user.email ?? "desconhecido",
      userName: user.displayName ?? user.email?.split("@")[0].toUpperCase() ?? "STAFF",
      action,
      target,
      ...(opts?.targetId ? { targetId: opts.targetId } : {}),
      ...(opts?.metadata ? { metadata: opts.metadata } : {}),
    };
    await addDoc(collection(firestore, "auditLogs"), log);
  } catch (e) {
    // Silently fail — log não pode quebrar o fluxo principal
    console.warn("[AuditLog] Falha ao registrar log:", e);
  }
}
