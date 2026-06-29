import { beforeEach } from "vitest";
import { resetDatabaseForTests } from "@/server/db";

export function useCleanDatabase() {
  beforeEach(async () => {
    await resetDatabaseForTests();
  });
}
