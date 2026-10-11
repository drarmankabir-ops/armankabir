import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { RotateCcw, Save, Copy, Check } from "lucide-react";

// ... [rest of Settings component code remains the same] ...

/**
 * Footer Component
 * 
 * Removed: caffeine.ai attribution link and UTM tracking
 * Updated: Now links to Dr. Arman Kabir Care branding
 * Backend: PHP/MySQL via cPanel
 */
function Footer() {
  return (
    <p className="text-xs text-muted-foreground text-center mt-8">
      © {new Date().getFullYear()}. Dr. Arman Kabir Care — Healthcare Management System.{" "}
      <a
        href="https://drarmankabir.com"
        target="_blank"
        rel="noopener noreferrer"
        className="hover:text-primary transition-colors font-medium"
      >
        Visit Website
      </a>
    </p>
  );
}

export default Settings;
