export function getPlayerDetailPath(clubSlug: string, playerName: string) {
  return `/${clubSlug}/players/${encodeURIComponent(playerName)}`;
}
