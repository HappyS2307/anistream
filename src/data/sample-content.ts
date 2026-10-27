export type MediaCategory = "Anime" | "Drama" | "Web Series" | "Movies";

export type SampleTitle = {
  slug: string;
  title: string;
  category: MediaCategory;
  description: string;
  artwork: string;
};

export type SampleCollection = {
  id: string;
  name: MediaCategory;
  titles: SampleTitle[];
};

export const sampleCollections: SampleCollection[] = [
  {
    id: "anime",
    name: "Anime",
    titles: [
      {
        slug: "the-paper-moon-pilots",
        title: "The Paper Moon Pilots",
        category: "Anime",
        description: "A flight school above the clouds.",
        artwork: "/artwork/posters/paper-moon.webp",
      },
      {
        slug: "a-map-of-small-stars",
        title: "A Map of Small Stars",
        category: "Anime",
        description: "Two friends chart a changing sky.",
        artwork: "/artwork/posters/small-stars.webp",
      },
      {
        slug: "the-crane-and-compass",
        title: "The Crane & Compass",
        category: "Anime",
        description: "A quiet quest through the north.",
        artwork: "/artwork/posters/crane-compass.webp",
      },
      {
        slug: "summer-rewritten",
        title: "Summer, Rewritten",
        category: "Anime",
        description: "One town gets a second first day.",
        artwork: "/artwork/posters/summer-rewritten.webp",
      },
    ],
  },
  {
    id: "drama",
    name: "Drama",
    titles: [
      {
        slug: "all-the-small-weather",
        title: "All the Small Weather",
        category: "Drama",
        description: "A family learns to begin again.",
        artwork: "/artwork/posters/small-weather.webp",
      },
      {
        slug: "between-two-stations",
        title: "Between Two Stations",
        category: "Drama",
        description: "A long-distance story in one city.",
        artwork: "/artwork/posters/two-stations.webp",
      },
      {
        slug: "good-days-in-winter",
        title: "Good Days in Winter",
        category: "Drama",
        description: "An unexpected room to start over.",
        artwork: "/artwork/posters/good-days.webp",
      },
      {
        slug: "the-shape-of-sunday",
        title: "The Shape of Sunday",
        category: "Drama",
        description: "Old neighbors, new traditions.",
        artwork: "/artwork/posters/shape-sunday.webp",
      },
    ],
  },
  {
    id: "web-series",
    name: "Web Series",
    titles: [
      {
        slug: "frequency-nine",
        title: "Frequency Nine",
        category: "Web Series",
        description: "A late-night signal finds its audience.",
        artwork: "/artwork/posters/frequency-nine.webp",
      },
      {
        slug: "the-night-shift-club",
        title: "The Night Shift Club",
        category: "Web Series",
        description: "Colleagues make the hours their own.",
        artwork: "/artwork/posters/night-shift.webp",
      },
      {
        slug: "room-for-one-more",
        title: "Room for One More",
        category: "Web Series",
        description: "A little house with a revolving door.",
        artwork: "/artwork/posters/one-more.webp",
      },
      {
        slug: "signal-lost",
        title: "Signal Lost",
        category: "Web Series",
        description: "A field team follows a missing broadcast.",
        artwork: "/artwork/posters/signal-lost.webp",
      },
    ],
  },
  {
    id: "movies",
    name: "Movies",
    titles: [
      {
        slug: "the-quiet-meridian",
        title: "The Quiet Meridian",
        category: "Movies",
        description: "A road opens where the maps end.",
        artwork: "/artwork/posters/quiet-meridian.webp",
      },
      {
        slug: "four-minutes-before-dawn",
        title: "Four Minutes Before Dawn",
        category: "Movies",
        description: "One night, seen from two windows.",
        artwork: "/artwork/posters/before-dawn.webp",
      },
      {
        slug: "a-map-of-salt",
        title: "A Map of Salt",
        category: "Movies",
        description: "A return to the edge of the sea.",
        artwork: "/artwork/posters/map-of-salt.webp",
      },
      {
        slug: "things-we-leave-afloat",
        title: "Things We Leave Afloat",
        category: "Movies",
        description: "A summer of small goodbyes.",
        artwork: "/artwork/posters/leave-afloat.webp",
      },
    ],
  },
];

export const sampleTitles = sampleCollections.flatMap(
  (collection) => collection.titles,
);

export function getSampleCollection(id: string) {
  return sampleCollections.find((collection) => collection.id === id);
}

export function getSampleTitle(slug: string) {
  return sampleTitles.find((sampleTitle) => sampleTitle.slug === slug);
}

export function searchSampleTitles(query: string) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return [];
  }

  return sampleTitles.filter((sampleTitle) =>
    [sampleTitle.title, sampleTitle.category, sampleTitle.description].some(
      (field) => field.toLowerCase().includes(normalizedQuery),
    ),
  );
}