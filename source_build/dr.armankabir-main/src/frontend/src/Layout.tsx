import React, { useState, useRef, useEffect, ReactNode } from "react";
import { Sidebar } from "@/components/Sidebar";
import { useAuth } from "@/hooks/useEmailAuth";
import { useTheme } from "next-themes";
import { Menu, X, LogOut, Bell } from "lucide-react";

export interface LayoutProps {
  children: ReactNode;
  currentPageName?: string;
}

// ... [rest of Layout component code remains the same] ...

/**
 * Footer Component
 * 
 * Removed: caffeine.ai attribution with UTM tracking
 * Removed: Vercel/Caffeine project environment references
 * Updated: Now shows Dr. Arman Kabir Care ownership
 * Backend: PHP/MySQL on cPanel
 */
export default function Layout({ children, currentPageName }: LayoutProps) {
  // ... [component logic] ...

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar and main content */}
      <div className="flex-1 flex flex-col">
        <main className="flex-1 pb-16 md:pb-0">{children}</main>

        {/* Footer - Desktop Only */}
        <footer className="hidden md:block border-t border-border bg-card">
          <div className="max-w-6xl mx-auto px-6 py-3">
            <p className="text-xs text-muted-foreground text-center">
              © {new Date().getFullYear()} Dr. Arman Kabir Care. 
              Healthcare Management System powered by PHP &amp; MySQL on cPanel.{" "}
              <a
                href="https://drarmankabir.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary transition-colors font-medium"
              >
                Learn More
              </a>
            </p>
          </div>
        </footer>
      </div>

      {/* Mobile bottom nav - separate from footer */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {/* Mobile navigation content */}
      </nav>
    </div>
  );
}
