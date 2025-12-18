export default function PostLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // No header - only the back button which is in the page itself
  return <>{children}</>;
}



