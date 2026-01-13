"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

function WorkspaceContent() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get("project");

  // В dev режиме разрешаем работу без projectId для удобства разработки
  // В production это должно быть обязательным
  const displayProjectId = projectId || "demo-project";
  const isDemoMode = !projectId;

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
        <h1 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
          Project Workspace
        </h1>
        <p className="max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-400">
          Managing project: <strong>{displayProjectId}</strong>
        </p>
        {isDemoMode && (
          <p className="max-w-md text-sm leading-6 text-yellow-600 dark:text-yellow-400">
            ⚠️ No project ID provided. Using demo mode. Add
            ?project=your-project-id to URL.
          </p>
        )}
        <p className="max-w-md text-sm leading-6 text-zinc-500 dark:text-zinc-500">
          This is where you work with your project data.
        </p>
      </main>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          Loading...
        </div>
      }
    >
      <WorkspaceContent />
    </Suspense>
  );
}
