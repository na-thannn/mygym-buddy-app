import { z } from "zod";

export const authEmailSchema = z.string().trim().toLowerCase().email().max(255);
