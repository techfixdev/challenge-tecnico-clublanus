import "server-only";

import { db } from "@/shared/lib/db";

import type { ReceiveDetailsRepository } from "../domain/account-identifiers";

export const prismaReceiveDetailsRepository: ReceiveDetailsRepository = {
  findByUserId(userId: string) {
    return db.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true, alias: true, cvu: true },
    });
  },
};
