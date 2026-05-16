import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, MessageSquare, Camera } from "lucide-react";
import { DeleteButton } from "./delete-button";

export default async function ProjectsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const projects = await prisma.project.findMany({
    where: { userId: user.userId },
    include: {
      _count: {
        select: { messages: true, snapshots: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">My Projects</h1>
        <a href="/projects/new">
          <Button>
            <Plus className="size-4" />
            新建项目
          </Button>
        </a>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <p className="text-lg mb-4">No projects yet</p>
          <a href="/projects/new">
            <Button variant="outline">
              <Plus className="size-4" />
              Create your first project
            </Button>
          </a>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Card key={project.id} className="relative">
              <CardHeader>
                <a
                  href={`/projects/${project.id}`}
                  className="hover:underline"
                >
                  <CardTitle>{project.name}</CardTitle>
                </a>
                {project.description && (
                  <CardDescription>{project.description}</CardDescription>
                )}
                <CardAction>
                  <DeleteButton projectId={project.id} projectName={project.name} />
                </CardAction>
              </CardHeader>
              <div className="px-4 pb-4 flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <MessageSquare className="size-3" />
                  {project._count.messages}
                </span>
                <span className="flex items-center gap-1">
                  <Camera className="size-3" />
                  {project._count.snapshots}
                </span>
                <span className="ml-auto">
                  {project.updatedAt.toLocaleDateString()}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
