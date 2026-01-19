"use client";

import { useParams } from "next/navigation";
import { EnterpriseFormWrapper } from "../../../../components/EnterpriseFormWrapper";
import { QueryProvider } from "shared";

/**
 * Страница редактирования предприятия
 */
export default function EditEnterprisePage() {
  const params = useParams();
  const enterpriseId = params.id as string;
  
  return (
    <QueryProvider>
      <EnterpriseFormWrapper mode="edit" enterpriseId={enterpriseId} />
    </QueryProvider>
  );
}
