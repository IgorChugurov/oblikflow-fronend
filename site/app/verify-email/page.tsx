"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
} from "shared";
import Link from "next/link";

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const confirmed = searchParams.get("confirmed");
  const [status, setStatus] = useState<"pending" | "success" | "error">(
    "pending"
  );
  const t = useTranslations("auth.verifyEmail");

  useEffect(() => {
    if (confirmed === "true") {
      setStatus("success");
    }
  }, [confirmed]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <Card className="w-full max-w-md">
        {status === "pending" && (
          <>
            <CardHeader>
              <CardTitle>{t("pending.title")}</CardTitle>
              <CardDescription>{t("pending.description")}</CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <div className="text-6xl">{t("pending.icon")}</div>
              <p className="text-sm text-muted-foreground">
                {t("pending.instructions")}
              </p>
            </CardContent>
          </>
        )}

        {status === "success" && (
          <>
            <CardHeader>
              <CardTitle>{t("success.title")}</CardTitle>
              <CardDescription>{t("success.description")}</CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <div className="text-6xl">{t("success.icon")}</div>
              <p className="text-sm text-muted-foreground">
                {t("success.instructions")}
              </p>
              <Link href="/login">
                <Button className="w-full">{t("success.loginButton")}</Button>
              </Link>
            </CardContent>
          </>
        )}

        {status === "error" && (
          <>
            <CardHeader>
              <CardTitle>{t("error.title")}</CardTitle>
              <CardDescription>{t("error.description")}</CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <div className="text-6xl">{t("error.icon")}</div>
              <p className="text-sm text-muted-foreground">
                {t("error.instructions")}
              </p>
              <Link href="/signup">
                <Button variant="outline" className="w-full">
                  {t("error.signupButton")}
                </Button>
              </Link>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}
