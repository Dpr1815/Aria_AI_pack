import { createFileRoute } from "@tanstack/react-router";
import { RoomPage } from "@/features/room";

export const Route = createFileRoute("/room/$roomId")({
  validateSearch: (search: Record<string, unknown>) => ({
    mode: search.mode as string | undefined,
  }),
  component: RoomRoute,
});

function RoomRoute() {
  const { roomId } = Route.useParams();
  const { mode } = Route.useSearch();
  return <RoomPage roomId={roomId} isTestMode={mode === "test"} />;
}
