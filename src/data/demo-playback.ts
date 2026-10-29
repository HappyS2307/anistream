import type { PlayerEpisode } from "@/lib/player/player-utils.mjs";

const demoServers = [
  {
    id: "abyss-player-test",
    serverName: "Abyss Player (test source)",
    embedUrl: "https://player.abyssplayer.com/N7HlJkX9Z",
    protectionEnabled: true,
    testSource: true,
  },
  {
    id: "demo-server-unconfigured",
    serverName: "Unconfigured demo server",
    embedUrl: null,
    protectionEnabled: false,
    demoOnly: true,
  },
];

const paperMoonDemoEpisodes: PlayerEpisode[] = [
  {
    id: "demo-episode-one",
    label: "Demo episode 1",
    sources: demoServers,
  },
  {
    id: "demo-episode-two",
    label: "Demo episode 2",
    sources: [
      {
        id: "demo-server-episode-two",
        serverName: "Unconfigured demo server",
        embedUrl: null,
        protectionEnabled: false,
        demoOnly: true,
      },
    ],
  },
  {
    id: "demo-episode-three",
    label: "Demo episode 3",
    sources: [
      {
        id: "demo-server-episode-three",
        serverName: "Unconfigured demo server",
        embedUrl: null,
        protectionEnabled: false,
        demoOnly: true,
      },
    ],
  },
];

export function getDemoPlayback(slug: string): PlayerEpisode[] {
  if (slug === "the-paper-moon-pilots") {
    return paperMoonDemoEpisodes;
  }

  return [];
}