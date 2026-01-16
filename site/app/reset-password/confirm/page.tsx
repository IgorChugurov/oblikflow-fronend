/**
 * Страница подтверждения сброса пароля
 * Использует готовый компонент ResetPasswordClient из shared
 */

import { ResetPasswordClient } from "shared";

export default function ResetPasswordConfirmPage() {
  return (
    <ResetPasswordClient redirectToAfterUpdate="/login?passwordUpdated=true" />
  );
}
