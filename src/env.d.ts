/// <reference types="astro/client" />
import type { Client, Workspace } from "./lib/server/access";
declare global {
  namespace App {
    interface Locals {
      supabase: Client | null;
      workspace?: Workspace;
      authHeaders: Headers;
    }
  }
}
export {};
