"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

interface PostPageWrapperProps {
  children: React.ReactNode;
}

export function PostPageWrapper({ children }: PostPageWrapperProps) {
  const router = useRouter();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        router.push("/");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router]);

  return <>{children}</>;
}

