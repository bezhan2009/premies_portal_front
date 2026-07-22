import { redirect } from "next/navigation";
import { AccountReconciliationPage } from "@/components/next/account-reconciliation/account-reconciliation-page";
import { hasAnyRole, requireSession } from "@/lib/next/auth";

export const metadata = {
  title: "Сверка счетов",
  description: "Регистрация правил и сверка операций по счетам с процессингом",
};

export default async function Page() {
  const session = await requireSession();
  if (!hasAnyRole(session.roles, [40])) redirect("/access-denied");

  return <AccountReconciliationPage />;
}
