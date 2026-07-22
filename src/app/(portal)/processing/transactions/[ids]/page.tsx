import { ProcessingTransactionsPage } from "@/components/next/processing/processing-transactions-page";

interface PageProps {
  params: Promise<{ ids: string }>;
}

export const metadata = {
  title: "Выписки из ПЦ | Activ Daily",
};

export default async function ProcessingTransactionsRoutePage({ params }: PageProps) {
  const { ids } = await params;
  return <ProcessingTransactionsPage ids={ids} />;
}
