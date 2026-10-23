// Maps anything thrown at the server boundary to the one error shape
// ({ error: { code, message } }, see docs/specs/web.md). Unknown errors are
// logged here and never reach the client.
import { Prisma } from "@project/db";
import { ZodError } from "@project/domain";
import { log } from "@project/log";

export type ErrorBody = { error: { code: string; message: string } };

export function mapError(err: unknown): { status: number; body: ErrorBody } {
  if (err instanceof ZodError)
    return { status: 400, body: { error: { code: "VALIDATION", message: err.issues[0]?.message ?? "Invalid input" } } };
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") return { status: 409, body: { error: { code: "CONFLICT", message: "Already exists" } } };
    if (err.code === "P2025") return { status: 404, body: { error: { code: "NOT_FOUND", message: "Not found" } } };
  }
  log.error({ err }, "unhandled server error");
  return { status: 500, body: { error: { code: "INTERNAL", message: "Something went wrong" } } };
}
