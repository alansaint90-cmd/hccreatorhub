import { Hub } from "@/components/hub";
export default function Home() {
  return <Hub configured={Boolean(process.env.DATABASE_URL)} />;
}
