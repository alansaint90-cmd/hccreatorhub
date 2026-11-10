import { Hub } from "@/components/hub";
export const dynamic = "force-dynamic";
export default function Home() {
  return <Hub configured={Boolean(process.env.DATABASE_URL)} />;
}
