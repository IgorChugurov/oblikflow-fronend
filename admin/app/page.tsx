"use client";

import { navigateToWorkspace } from "shared";

export default function Home() {
  const handleProjectSelect = (projectId: string) => {
    // При выборе проекта - редирект на workspace
    navigateToWorkspace(projectId, "/");
  };

  // Пример проекта
  const exampleProjectId = "project-123";

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
        <h1 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
          Project Management Dashboard
        </h1>
        <p className="max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-400">
          Select or create a project to get started.
        </p>
        <div className="flex flex-col gap-4 text-base font-medium sm:flex-row">
          <button
            onClick={() => handleProjectSelect(exampleProjectId)}
            className="flex h-12 w-full items-center justify-center rounded-full bg-foreground px-5 text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc] md:w-[158px]"
          >
            Open Project
          </button>
        </div>
      </main>
    </div>
  );
}
