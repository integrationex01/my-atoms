import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";

async function logout() {
  "use server";
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  cookieStore.set("token", "", { maxAge: 0 });
  redirect("/login");
}

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center px-6">
          <a href="/projects" className="font-semibold text-lg mr-auto">
            Atoms Demo
          </a>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {user.username}
            </span>
            <form action={logout}>
              <Button type="submit" variant="outline" size="sm">
                Logout
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
