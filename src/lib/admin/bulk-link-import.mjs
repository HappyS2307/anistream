import { validateEmbedUrl } from "@/lib/player/player-utils.mjs";

export const MAX_IMPORT_RECORDS = 100;
export const IMPORT_CSV_HEADERS = [
  "content_slug",
  "season",
  "episode",
  "type",
  "server",
  "provider",
  "quality",
  "audio",
  "url",
];

const REQUIRED_CSV_HEADERS = ["content_slug", "season", "episode", "type", "url"];

function splitCsv(text) {
  const rows = [];
  const errors = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];

    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
      continue;
    }

    if (character === '"') {
      if (field.length !== 0) {
        errors.push({ row: rows.length + 1, code: "malformed_csv", message: "A quote must start a CSV field." });
        return { rows: [], errors };
      }
      quoted = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n" || character === "\r") {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(field);
      if (row.some((cell) => cell.trim() !== "")) rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }

  if (quoted) {
    errors.push({ row: rows.length + 1, code: "malformed_csv", message: "A quoted CSV field is not closed." });
    return { rows: [], errors };
  }

  row.push(field);
  if (row.some((cell) => cell.trim() !== "")) rows.push(row);
  return { rows, errors };
}

function positiveInteger(value) {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : Number.NaN;
}

export function parseAdvancedCsv(text, expectedKind) {
  if (typeof text !== "string" || text.length > 1_000_000) {
    return {
      rows: [],
      errors: [{ row: 0, code: "input_too_large", message: "CSV input exceeds the 1 MB limit." }],
    };
  }

  const { rows, errors } = splitCsv(text.replace(/^\uFEFF/, ""));
  if (errors.length > 0) return { rows: [], errors };
  if (rows.length === 0) {
    return { rows: [], errors: [{ row: 0, code: "missing_header", message: "CSV input is empty." }] };
  }

  const headers = rows[0].map((header) => header.trim().toLowerCase());
  const headerErrors = [];
  const headerSet = new Set(headers);

  if (headers.some((header) => !IMPORT_CSV_HEADERS.includes(header))) {
    headerErrors.push({ row: 1, code: "unsupported_column", message: "CSV contains an unsupported column." });
  }
  if (headerSet.size !== headers.length) {
    headerErrors.push({ row: 1, code: "duplicate_column", message: "CSV contains duplicate column names." });
  }
  for (const requiredHeader of REQUIRED_CSV_HEADERS) {
    if (!headerSet.has(requiredHeader)) {
      headerErrors.push({ row: 1, code: "missing_column", message: `CSV is missing required column: ${requiredHeader}.` });
    }
  }
  if (headerErrors.length > 0) return { rows: [], errors: headerErrors };

  const parsedRows = [];
  const rowErrors = [];
  for (const [index, cells] of rows.slice(1).entries()) {
    const rowNumber = index + 2;
    if (cells.length !== headers.length) {
      rowErrors.push({ row: rowNumber, code: "malformed_csv", message: "CSV row has a different number of fields than the header." });
      continue;
    }

    const values = Object.fromEntries(headers.map((header, cellIndex) => [header, cells[cellIndex].trim()]));
    const kind = values.type.toLowerCase();
    const record = {
      row: rowNumber,
      contentSlug: values.content_slug,
      seasonNumber: positiveInteger(values.season),
      episodeNumber: positiveInteger(values.episode),
      kind,
      serverName: values.server,
      providerName: values.provider,
      quality: values.quality,
      audioLanguage: values.audio,
      url: values.url,
    };

    if (kind !== expectedKind) {
      rowErrors.push({ row: rowNumber, code: "wrong_import_type", message: `CSV row type must be ${expectedKind}.` });
    } else {
      parsedRows.push(record);
    }
  }

  if (parsedRows.length > MAX_IMPORT_RECORDS) {
    return {
      rows: [],
      errors: [{ row: 0, code: "batch_too_large", message: `Imports are limited to ${MAX_IMPORT_RECORDS} records.` }],
    };
  }

  return { rows: parsedRows, errors: rowErrors };
}

export function parseSimplePaste(text, mapping) {
  if (typeof text !== "string" || text.length > 1_000_000) {
    return {
      rows: [],
      errors: [{ row: 0, code: "input_too_large", message: "Paste input exceeds the 1 MB limit." }],
    };
  }

  const kind = mapping?.kind;
  if (kind !== "stream" && kind !== "download") {
    return { rows: [], errors: [{ row: 0, code: "invalid_import_type", message: "Choose stream or download import." }] };
  }

  const contentSlug = typeof mapping.contentSlug === "string" ? mapping.contentSlug.trim() : "";
  const seasonValue = positiveInteger(mapping.seasonNumber);
  let nextEpisode = positiveInteger(mapping.startingEpisode);
  const rows = [];
  const errors = [];

  if (!contentSlug) errors.push({ row: 0, code: "missing_content", message: "Select content before mapping URLs." });
  if (mapping.contentKind !== "movie" && (!seasonValue || Number.isNaN(seasonValue))) {
    errors.push({ row: 0, code: "missing_season", message: "Select a valid season for episodic content." });
  }
  if (mapping.contentKind !== "movie" && (!nextEpisode || Number.isNaN(nextEpisode))) {
    errors.push({ row: 0, code: "missing_start_episode", message: "Select a valid starting episode." });
  }
  if (kind === "stream" && !mapping.serverName) {
    errors.push({ row: 0, code: "missing_server", message: "Select a streaming server." });
  }
  if (kind === "download" && !mapping.providerName) {
    errors.push({ row: 0, code: "missing_provider", message: "Select a download provider." });
  }
  if (errors.length > 0) return { rows: [], errors };

  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length > MAX_IMPORT_RECORDS) {
    return {
      rows: [],
      errors: [{ row: 0, code: "batch_too_large", message: `Imports are limited to ${MAX_IMPORT_RECORDS} records.` }],
    };
  }

  for (const [index, line] of lines.entries()) {
    const numbered = line.match(/^(\d+)\s*\|\s*(.+)$/);
    const episodeNumber = mapping.contentKind === "movie"
      ? null
      : numbered
        ? positiveInteger(numbered[1])
        : nextEpisode;
    const url = numbered ? numbered[2].trim() : line;

    if (mapping.contentKind !== "movie" && (!episodeNumber || Number.isNaN(episodeNumber))) {
      errors.push({ row: index + 1, code: "invalid_episode", message: "Episode number must be a positive integer." });
      continue;
    }

    rows.push({
      row: index + 1,
      contentSlug,
      seasonNumber: mapping.contentKind === "movie" ? null : seasonValue,
      episodeNumber,
      kind,
      serverName: kind === "stream" ? mapping.serverName : "",
      providerName: kind === "download" ? mapping.providerName : "",
      quality: "",
      audioLanguage: "",
      url,
    });

    if (mapping.contentKind !== "movie") nextEpisode = episodeNumber + 1;
  }

  return { rows, errors };
}

export function validateImportRows(rows, context, expectedKind) {
  const seen = new Set();
  const results = [];

  for (const row of rows) {
    let message = "Ready to import.";
    let status = "ready";
    let normalized = null;
    const content = context.contents.find((entry) => entry.slug === row.contentSlug);

    if (!content) {
      status = "rejected";
      message = "Unknown content slug.";
    } else if (row.kind !== expectedKind) {
      status = "rejected";
      message = `Wrong import type; expected ${expectedKind}.`;
    } else if (content.kind === "movie") {
      if (row.seasonNumber || row.episodeNumber) {
        status = "rejected";
        message = "Movie imports must not include season or episode numbers.";
      } else {
        normalized = { contentId: content.id, episodeId: null };
      }
    } else if (!Number.isInteger(row.seasonNumber) || !Number.isInteger(row.episodeNumber)) {
      status = "rejected";
      message = "A valid season and episode mapping is required.";
    } else {
      const season = context.seasons.find(
        (entry) => entry.content_id === content.id && entry.season_number === row.seasonNumber,
      );
      const episode = season && context.episodes.find(
        (entry) => entry.season_id === season.id && entry.episode_number === row.episodeNumber,
      );
      if (!season || !episode) {
        status = "rejected";
        message = "Season or episode mapping was not found.";
      } else {
        normalized = { contentId: null, episodeId: episode.id };
      }
    }

    let providerId = null;
    let serverId = null;
    let allowedHosts = [];
    if (status === "ready" && expectedKind === "stream") {
      const server = context.streamingServers.find(
        (entry) => entry.name.toLowerCase() === row.serverName.trim().toLowerCase(),
      );
      if (!server) {
        status = "rejected";
        message = "Unknown or disabled streaming server.";
      } else {
        serverId = server.id;
        allowedHosts = [server.hostname];
      }
    } else if (status === "ready") {
      const provider = context.downloadProviders.find(
        (entry) => entry.name.toLowerCase() === row.providerName.trim().toLowerCase(),
      );
      if (!provider) {
        status = "rejected";
        message = "Unknown or disabled download provider.";
      } else {
        providerId = provider.id;
        allowedHosts = [provider.hostname];
      }
    }

    if (status === "ready" && (!row.url || !validateImportUrl(row.url, allowedHosts))) {
      status = "rejected";
      message = "URL must be valid HTTPS on the selected approved hostname.";
    }

    if (status === "ready" && row.quality.length > 40) {
      status = "rejected";
      message = "Quality exceeds the 40-character limit.";
    }
    if (status === "ready" && row.audioLanguage.length > 40) {
      status = "rejected";
      message = "Audio/language exceeds the 40-character limit.";
    }

    if (status === "ready") {
      normalized = {
        ...normalized,
        serverId,
        providerId,
        url: validateImportUrl(row.url, allowedHosts),
        quality: expectedKind === "download" ? row.quality || null : null,
        audioLanguage: expectedKind === "download" ? row.audioLanguage || null : null,
      };
      const duplicateKey = [
        expectedKind,
        normalized.contentId ?? normalized.episodeId,
        serverId ?? providerId,
        normalized.url,
      ].join("|");
      if (seen.has(duplicateKey)) {
        status = "skipped";
        message = "Duplicate within this import.";
      } else {
        seen.add(duplicateKey);
      }
    }

    results.push({ row: row.row, status, message, normalized });
  }

  return results;
}

function validateImportUrl(value, allowedHosts) {
  return validateEmbedUrl(value, allowedHosts);
}
