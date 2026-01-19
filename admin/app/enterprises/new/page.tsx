"use client";

import { EnterpriseFormWrapper } from "../../../components/EnterpriseFormWrapper";
import { QueryProvider } from "shared";

/**
 * Страница создания нового предприятия
 */
export default function NewEnterprisePage() {
  return (
    <QueryProvider>
      <EnterpriseFormWrapper mode="create" />
    </QueryProvider>
  );
}
