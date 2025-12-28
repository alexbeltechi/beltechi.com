/**
 * Database Error Dialog
 * 
 * Shows user-friendly error when database connection fails
 */

"use client";

import { useState, useEffect } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertCircle, CheckCircle2, Clock, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DatabaseErrorDialogProps {
  error: string | null;
  onClose?: () => void;
}

export function DatabaseErrorDialog({ error, onClose }: DatabaseErrorDialogProps) {
  const [open, setOpen] = useState(false);
  const [checking, setChecking] = useState(false);
  const [status, setStatus] = useState<"checking" | "healthy" | "unhealthy" | null>(null);

  useEffect(() => {
    if (error) {
      setOpen(true);
    }
  }, [error]);

  const handleClose = () => {
    setOpen(false);
    onClose?.();
  };

  const checkStatus = async () => {
    setChecking(true);
    setStatus("checking");
    
    try {
      const response = await fetch("/api/health");
      const data = await response.json();
      
      if (data.status === "healthy") {
        setStatus("healthy");
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        setStatus("unhealthy");
      }
    } catch {
      setStatus("unhealthy");
    } finally {
      setChecking(false);
    }
  };

  const getErrorDetails = (error: string) => {
    if (error.includes("ENOTFOUND") || error.includes("querySrv")) {
      return {
        title: "DNS Resolution Failed",
        message: "MongoDB cluster DNS is still propagating",
        suggestion: "This is normal for new clusters. Usually takes 30-60 minutes.",
      };
    }
    if (error.includes("Authentication failed")) {
      return {
        title: "Authentication Failed",
        message: "MongoDB credentials are incorrect",
        suggestion: "Check your username and password in the connection string.",
      };
    }
    if (error.includes("timed out")) {
      return {
        title: "Connection Timeout",
        message: "Could not reach MongoDB server",
        suggestion: "Check your network connection and MongoDB Atlas firewall rules.",
      };
    }
    return {
      title: "Database Connection Failed",
      message: "Unable to connect to MongoDB",
      suggestion: "Check your configuration and try again.",
    };
  };

  if (!error) return null;

  const details = getErrorDetails(error);

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <div className="flex items-start gap-4">
            <div className="rounded-full bg-destructive/10 p-3">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <div className="flex-1">
              <AlertDialogTitle className="text-xl mb-2">
                {details.title}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-base space-y-4">
                <p className="text-foreground font-medium">{details.message}</p>
                <p className="text-muted-foreground">{details.suggestion}</p>

                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <p className="font-medium text-foreground">Common causes:</p>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <Clock className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                      <span>MongoDB cluster DNS still propagating (wait 30-60 min for new clusters)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                      <span>MONGODB_URI not configured correctly in .env.local</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                      <span>Network firewall or IP not whitelisted in MongoDB Atlas</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                  <p className="font-medium text-foreground text-sm">Technical details:</p>
                  <code className="text-xs text-muted-foreground block overflow-x-auto">
                    {error}
                  </code>
                </div>

                {status && (
                  <div className={`p-4 rounded-lg flex items-center gap-3 ${
                    status === "healthy" 
                      ? "bg-green-500/10 text-green-700 dark:text-green-400" 
                      : status === "checking"
                      ? "bg-blue-500/10 text-blue-700 dark:text-blue-400"
                      : "bg-destructive/10 text-destructive"
                  }`}>
                    {status === "healthy" ? (
                      <>
                        <CheckCircle2 className="h-5 w-5" />
                        <span className="font-medium">Database connected! Reloading...</span>
                      </>
                    ) : status === "checking" ? (
                      <>
                        <Clock className="h-5 w-5 animate-spin" />
                        <span className="font-medium">Checking connection...</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-5 w-5" />
                        <span className="font-medium">Still unavailable. Try again in a few minutes.</span>
                      </>
                    )}
                  </div>
                )}
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => window.open("https://cloud.mongodb.com", "_blank")}
            className="gap-2"
          >
            MongoDB Atlas
            <ExternalLink className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            onClick={checkStatus}
            disabled={checking}
            className="gap-2"
          >
            {checking ? (
              <>
                <Clock className="h-4 w-4 animate-spin" />
                Checking...
              </>
            ) : (
              <>Check Status</>
            )}
          </Button>
          <AlertDialogAction onClick={handleClose}>
            Close
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

