/**
 * Database Error Handler
 * 
 * Intercepts fetch requests and shows friendly error dialog for database errors
 */

"use client";

import { useEffect, useState } from "react";
import { DatabaseErrorDialog } from "./database-error-dialog";

export function DatabaseErrorHandler({ children }: { children: React.ReactNode }) {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Intercept fetch to catch database errors
    const originalFetch = window.fetch;
    
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);
        
        // Check if it's a database error
        if (!response.ok && response.headers.get("content-type")?.includes("application/json")) {
          const clone = response.clone();
          try {
            const data = await clone.json();
            
            if (data.code && data.code.startsWith("DB_")) {
              // It's a database error - show dialog
              setError(data.error + "\n\n" + (data.message || ""));
            }
          } catch {
            // Not JSON or couldn't parse
          }
        }
        
        return response;
      } catch (err) {
        // Network error or fetch failed
        if (err instanceof Error) {
          if (err.message.includes("Failed to fetch")) {
            setError("Network error: Could not reach the server. Check your connection.");
          }
        }
        throw err;
      }
    };

    // Also listen for custom database error events
    const handleDatabaseError = (event: CustomEvent) => {
      setError(event.detail.error);
    };

    window.addEventListener("database-error" as any, handleDatabaseError);

    return () => {
      window.fetch = originalFetch;
      window.removeEventListener("database-error" as any, handleDatabaseError);
    };
  }, []);

  return (
    <>
      {children}
      <DatabaseErrorDialog error={error} onClose={() => setError(null)} />
    </>
  );
}

/**
 * Manually trigger database error dialog
 */
export function showDatabaseError(error: string) {
  window.dispatchEvent(
    new CustomEvent("database-error", { detail: { error } })
  );
}

