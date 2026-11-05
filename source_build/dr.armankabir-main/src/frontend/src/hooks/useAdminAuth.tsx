/**
 * Admin Auth Hook — PHP/MySQL Backend
 *
 * Admin authentication goes through the PHP API via authService.
 * Session state is kept in memory only — no localStorage.
 */

import { useCallback, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { initializeServerStorage } from "../lib/storageAdapter";
import { authService } from "../services/auth";
import { landingService } from "../services/landing";
import { toast } from "sonner";

export function useAdminAuth() {
  const queryClient = useQueryClient();
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [adminId, setAdminId] = useState<number | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    let active = true;
    void authService.verifyAdminSession().then((admin) => {
      if (active && admin) {
        setIsAdmin(true);
        setAdminId(admin.id);
      }
      if (active) setIsInitializing(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const adminLogin = useCallback(
    async (username: string, password: string): Promise<boolean> => {
      const result = await authService.adminSignIn(username, password);
      if (!result.is_admin) return false;
      try {
        await initializeServerStorage(`admin:${result.admin.id}`);
        await landingService.migrateLegacyContent();
      } catch (migrationError) {
        toast.error(
          migrationError instanceof Error
            ? `Legacy website content migration failed: ${migrationError.message}`
            : "Legacy website content migration failed.",
        );
      }
      setIsAdmin(true);
      setAdminId(result.admin.id);
      await queryClient.invalidateQueries({ queryKey: ["siteConfig"] });
      return true;
    },
    [queryClient],
  );

  const adminLogout = useCallback(async () => {
    await authService.signOut();
    setIsAdmin(false);
    setAdminId(null);
  }, []);

  return { isAdmin, adminId, adminLogin, adminLogout, isInitializing };
}