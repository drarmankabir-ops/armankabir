/**
 * Admin Auth Hook — PHP/MySQL Backend
 *
 * Admin authentication goes through the PHP API via authService.
 * Session state is kept in memory only — no localStorage.
 */

import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { initializeServerStorage } from "../lib/storageAdapter";
import { authService } from "../services/auth";
import { landingService } from "../services/landing";
import { toast } from "sonner";

export function useAdminAuth() {
  const queryClient = useQueryClient();
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [adminId, setAdminId] = useState<number | null>(null);

  const adminLogin = useCallback(
    async (username: string, password: string): Promise<boolean> => {
      try {
        const result = await authService.signIn(username, password);
        if (result.user?.role === "admin") {
          try {
            await initializeServerStorage(`user:${result.user.id}`);
            await landingService.migrateLegacyContent();
          } catch (migrationError) {
            toast.error(
              migrationError instanceof Error
                ? `Legacy website content migration failed: ${migrationError.message}`
                : "Legacy website content migration failed.",
            );
          }
          setIsAdmin(true);
          setAdminId(result.user.id);
          await queryClient.invalidateQueries({ queryKey: ["siteConfig"] });
          return true;
        }
        await authService.signOut();
      } catch {
        setIsAdmin(false);
        setAdminId(null);
      }
      return false;
    },
    [queryClient],
  );

  const adminLogout = useCallback(async () => {
    await authService.signOut();
    setIsAdmin(false);
    setAdminId(null);
  }, []);

  return { isAdmin, adminId, adminLogin, adminLogout };
}