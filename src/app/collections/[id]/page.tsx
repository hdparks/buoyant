import { getCollection } from "@/app/lib/storage";
import RankingPage from "@/app/components/RankingPage";
import { notFound } from "next/navigation";

export default async function CollectionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const collection = getCollection(id);

  if (!collection) {
    notFound();
  }

  return <RankingPage collection={collection} />;
}
