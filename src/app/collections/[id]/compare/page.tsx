import { getCollection } from "@/app/lib/storage";
import { notFound } from "next/navigation";
import CompareView from "./CompareView";

export default async function ComparePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const collection = getCollection(id);

  if (!collection) {
    notFound();
  }

  return <CompareView collection={collection} />;
}
