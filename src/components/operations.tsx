"use client";
import type { Props } from "./operation-filters";
import { CommunityOperations } from "./community-operations";
import { CollaborationOperations } from "./collaboration-operations";
import { BusinessOperations } from "./business-operations";
export function Operations(props: Props) {
  if (["companies", "creators"].includes(props.view)) return <CommunityOperations {...props} />;
  if (["applications", "partnerships"].includes(props.view)) return <CollaborationOperations {...props} />;
  return <BusinessOperations {...props} />;
}
