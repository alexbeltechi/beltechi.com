import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { ThemeProvider } from "@/components/providers/theme-provider";

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <div className="min-h-screen bg-white dark:bg-zinc-950 flex flex-col">
        <Header />
        <div className="flex-1">{children}</div>
        <Footer />
      </div>
    </ThemeProvider>
  );
}






