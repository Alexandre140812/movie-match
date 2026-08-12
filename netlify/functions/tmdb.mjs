const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const GENRE_IDS = {
  "Ação": 28,
  "Aventura": 12,
  "Animação": 16,
  "Comédia": 35,
  "Crime": 80,
  "Documentário": 99,
  "Drama": 18,
  "Família": 10751,
  "Fantasia": 14,
  "História": 36,
  "Terror": 27,
  "Música": 10402,
  "Mistério": 9648,
  "Romance": 10749,
  "Ficção": 878,
  "Suspense": 53,
  "Guerra": 10752,
  "Faroeste": 37,
};

const MOOD_GENRES = {
  "Divertido": [35, 16, 10751],
  "Emocionante": [18, 12, 10749],
  "Tenso": [53, 27, 80, 28],
  "Relaxante": [35, 10751, 16, 10749],
  "Misterioso": [9648, 53, 80],
  "Inspirador": [18, 36, 99, 10402],
};

const FEATURE_GENRES = {
  "História": [18, 36, 9648],
  "Ação": [28, 12],
  "Personagens": [18, 35, 10749],
  "Humor": [35, 16],
  "Visual": [878, 14, 16, 12],
  "Suspense": [53, 9648, 27],
  "Música": [10402],
};

const COMPANY_GENRES = {
  "Família": [10751, 16, 35, 12],
  "Amigos": [28, 35, 27, 12, 16],
  "Casal": [10749, 35, 18],
};

// ============================================================
// GÊNEROS E REGRAS PARA SÉRIES
// ============================================================

const TV_GENRE_IDS = {
  "Ação": [10759],
  "Aventura": [10759],
  "Animação": [16],
  "Comédia": [35],
  "Crime": [80],
  "Documentário": [99],
  "Drama": [18],
  "Família": [10751, 10762],
  "Fantasia": [10765],
  "História": [18, 10768],
  "Terror": [9648, 10765],
  "Música": [18, 35],
  "Mistério": [9648],
  "Romance": [18, 35],
  "Ficção": [10765],
  "Suspense": [9648, 80, 18],
  "Guerra": [10768],
  "Faroeste": [37],
};

const TV_MOOD_GENRES = {
  "Divertido": [35, 16, 10751, 10762],
  "Emocionante": [18, 10759, 10765],
  "Tenso": [9648, 80, 10759, 18],
  "Relaxante": [35, 10751, 16],
  "Misterioso": [9648, 80],
  "Inspirador": [18, 99, 10759],
};

const TV_FEATURE_GENRES = {
  "História": [18, 9648, 99],
  "Ação": [10759],
  "Personagens": [18, 35, 80],
  "Humor": [35, 16],
  "Visual": [10765, 16, 10759],
  "Suspense": [9648, 80, 18],
  "Música": [18, 35],
};

const TV_COMPANY_GENRES = {
  "Família": [10751, 10762, 16, 35, 10759],
  "Amigos": [10759, 35, 9648, 16],
  "Casal": [18, 35],
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function uniqueStrings(values) {
  return [...new Set(values.filter(Boolean))];
}

function genreIdsFromMovie(movie) {
  return Array.isArray(movie?.genre_ids)
    ? movie.genre_ids
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id))
    : [];
}

function hasIntersection(first, second) {
  if (!Array.isArray(first) || !Array.isArray(second)) {
    return false;
  }

  const set = new Set(first);

  return second.some((value) => set.has(value));
}

function getBrazilCertification(releaseDatesData) {
  const brazil = releaseDatesData.results?.find(
    (country) => country.iso_3166_1 === "BR",
  );

  if (!brazil || !Array.isArray(brazil.release_dates)) {
    return "Não informada";
  }

  const releases = brazil.release_dates;

  const preferredTypes = [3, 4, 6, 2, 1, 5];

  let certification = "";

  for (const type of preferredTypes) {
    const release = releases.find(
      (item) =>
        item.type === type &&
        typeof item.certification === "string" &&
        item.certification.trim() !== "",
    );

    if (release) {
      certification = release.certification.trim();
      break;
    }
  }

  if (!certification) {
    const anyRelease = releases.find(
      (item) =>
        typeof item.certification === "string" &&
        item.certification.trim() !== "",
    );

    certification = anyRelease?.certification?.trim() ?? "";
  }

  if (!certification) {
    return "Não informada";
  }

  if (certification.toUpperCase() === "L") {
    return "Livre";
  }

  if (/^\d+$/.test(certification)) {
    return `${certification} anos`;
  }

  return certification;
}

function getBestTrailer(videosData) {
  const videos = Array.isArray(videosData?.results)
    ? videosData.results
    : [];

  const youtubeVideos = videos.filter(
    (video) =>
      video.site === "YouTube" &&
      typeof video.key === "string" &&
      video.key.length > 0,
  );

  if (youtubeVideos.length === 0) {
    return "";
  }

  const officialTrailer = youtubeVideos.find(
    (video) =>
      video.type === "Trailer" &&
      video.official === true,
  );

  const anyTrailer = youtubeVideos.find(
    (video) => video.type === "Trailer",
  );

  const teaser = youtubeVideos.find(
    (video) => video.type === "Teaser",
  );

  const chosen =
    officialTrailer ??
    anyTrailer ??
    teaser ??
    youtubeVideos[0];

  return `https://www.youtube.com/watch?v=${chosen.key}`;
}

function normalizeProviders(list) {
  if (!Array.isArray(list)) {
    return [];
  }

  return list.map((provider) => ({
    id: provider.provider_id,
    name: provider.provider_name,
    logo: provider.logo_path
      ? `https://image.tmdb.org/t/p/w185${provider.logo_path}`
      : "",
  }));
}

function providerMatchesSelection(selection, providerName) {
  const selected = normalizeText(selection);
  const provider = normalizeText(providerName);

  if (!selected || selected === "outro") {
    return false;
  }

  if (selected === "netflix") {
    return provider.includes("netflix");
  }

  if (selected === "prime video") {
    return (
      provider.includes("amazon prime video") ||
      provider === "prime video"
    );
  }

  if (selected === "disney+") {
    return (
      provider.includes("disney plus") ||
      provider.includes("disney+")
    );
  }

  if (selected === "hbo max" || selected === "max") {
    return (
      provider === "max" ||
      provider.includes("hbo max") ||
      provider.includes("max amazon channel")
    );
  }

  if (selected === "globoplay") {
    return provider.includes("globoplay");
  }

  if (selected === "apple tv+") {
    return (
      provider.includes("apple tv plus") ||
      provider.includes("apple tv+")
    );
  }

  if (selected === "paramount+") {
    return (
      provider.includes("paramount plus") ||
      provider.includes("paramount+")
    );
  }

  if (selected === "crunchyroll") {
    return provider.includes("crunchyroll");
  }

  if (selected === "universal+") {
    return (
      provider.includes("universal+") ||
      provider.includes("universal plus")
    );
  }

  if (selected === "claro tv+") {
    return (
      provider.includes("claro tv") ||
      provider.includes("claro video")
    );
  }

  return provider.includes(selected);
}


function providerMatchesDirectStreaming(
  selection,
  providerName,
) {
  const provider =
    normalizeText(providerName);

  // A aba de streaming representa a assinatura principal,
  // não canais vendidos dentro de outro serviço.
  if (
    provider.includes("amazon channel") ||
    provider.includes("apple tv channel") ||
    provider.includes("channels")
  ) {
    return false;
  }

  return providerMatchesSelection(
    selection,
    providerName,
  );
}

function movieYear(movie) {
  const releaseDate = String(movie?.release_date ?? "");

  if (releaseDate.length < 4) {
    return 0;
  }

  return Number(releaseDate.substring(0, 4)) || 0;
}

function matchesEra(movie, era, currentYear) {
  const year = movieYear(movie);

  if (!era || era === "Tanto faz") {
    return true;
  }

  if (year <= 0) {
    return false;
  }

  if (era === "Lançamentos") {
    return year >= currentYear - 3;
  }

  if (era === "Recentes") {
    return year >= currentYear - 15;
  }

  if (era === "Clássicos") {
    return year < currentYear - 15;
  }

  return true;
}

function scoreMovie({
  movie,
  genre,
  mood,
  era,
  duration,
  company,
  feature,
  selectedStreamings,
  favoriteGenreIds,
  streamingFilterApplied,
  currentYear,
}) {
  const ids = genreIdsFromMovie(movie);

  let points = 0;
  let maximumPoints = 0;

  const selectedGenreId = GENRE_IDS[genre];

  if (genre && selectedGenreId) {
    maximumPoints += 30;

    if (ids.includes(selectedGenreId)) {
      points += 30;
    }
  }

  if (mood && MOOD_GENRES[mood]) {
    maximumPoints += 20;

    if (hasIntersection(ids, MOOD_GENRES[mood])) {
      points += 20;
    }
  }

  if (era && era !== "Tanto faz") {
    maximumPoints += 15;

    if (matchesEra(movie, era, currentYear)) {
      points += 15;
    }
  }

  if (
    selectedStreamings.length > 0 &&
    streamingFilterApplied
  ) {
    maximumPoints += 20;

    // O Discover já filtrou para pelo menos um streaming escolhido.
    points += 20;
  }

  if (duration && duration !== "Tanto faz") {
    maximumPoints += 15;

    // O Discover já filtrou pela duração.
    points += 15;
  }

  if (
    company &&
    company !== "Tanto faz" &&
    company !== "Sozinho"
  ) {
    maximumPoints += 10;

    if (
      COMPANY_GENRES[company] &&
      hasIntersection(ids, COMPANY_GENRES[company])
    ) {
      points += 10;
    }
  } else if (company === "Sozinho") {
    maximumPoints += 10;
    points += 10;
  }

  if (feature && FEATURE_GENRES[feature]) {
    maximumPoints += 20;

    if (hasIntersection(ids, FEATURE_GENRES[feature])) {
      points += 20;
    }
  }

  if (favoriteGenreIds.length > 0) {
    maximumPoints += 20;

    if (hasIntersection(ids, favoriteGenreIds)) {
      points += 20;
    }
  }

  if (maximumPoints === 0) {
    const rating = Number(movie.vote_average ?? 0);

    return Math.max(
      0,
      Math.min(100, Math.round(rating * 10)),
    );
  }

  return Math.max(
    0,
    Math.min(
      100,
      Math.round((points / maximumPoints) * 100),
    ),
  );
}


// ============================================================
// HELPERS GENÉRICOS: FILME + SÉRIE
// ============================================================

function parseDateOnly(value) {
  const raw = String(value ?? "").trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return null;
  }

  const date = new Date(`${raw}T00:00:00Z`);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function isFutureDate(value) {
  const parsed = parseDateOnly(value);

  if (!parsed) {
    return false;
  }

  const now = new Date();
  const today = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
    ),
  );

  return parsed.getTime() > today.getTime();
}

function mediaDate(item, mediaType) {
  return String(
    mediaType === "tv"
      ? item?.first_air_date ?? item?.air_date ?? ""
      : item?.release_date ?? "",
  );
}

function mediaYear(item, mediaType) {
  const date = mediaDate(item, mediaType);

  if (date.length < 4) {
    return 0;
  }

  return Number(date.substring(0, 4)) || 0;
}

function mediaTitle(item, mediaType) {
  if (mediaType === "tv") {
    return String(
      item?.name ??
        item?.original_name ??
        "",
    );
  }

  return String(
    item?.title ??
      item?.original_title ??
      "",
  );
}

function mediaOriginalTitle(item, mediaType) {
  if (mediaType === "tv") {
    return String(
      item?.original_name ??
        item?.name ??
        "",
    );
  }

  return String(
    item?.original_title ??
      item?.title ??
      "",
  );
}

function normalizeMediaItem(item, mediaType) {
  const title = mediaTitle(item, mediaType);
  const originalTitle =
    mediaOriginalTitle(item, mediaType);
  const releaseDate =
    mediaDate(item, mediaType);

  return {
    ...item,

    media_type: mediaType,
    mediaType,

    // Campos compatíveis com o mapeamento que o Flutter já usa
    // para filmes. Assim séries podem entrar no banner e no
    // Movie Match sem duplicarmos toda a estrutura.
    title,
    original_title: originalTitle,
    release_date: releaseDate,

    year:
      releaseDate.length >= 4
        ? Number(releaseDate.substring(0, 4)) || 0
        : 0,

    name:
      mediaType === "tv"
        ? item?.name ?? title
        : item?.name,

    original_name:
      mediaType === "tv"
        ? item?.original_name ?? originalTitle
        : item?.original_name,

    first_air_date:
      mediaType === "tv"
        ? item?.first_air_date ?? releaseDate
        : item?.first_air_date,
  };
}

function normalizeMediaPreference(value) {
  const normalized = normalizeText(value);

  if (
    normalized === "serie" ||
    normalized === "series" ||
    normalized === "tv" ||
    normalized === "show"
  ) {
    return "tv";
  }

  if (
    normalized === "tanto faz" ||
    normalized === "ambos" ||
    normalized === "both" ||
    normalized === "filme ou serie" ||
    normalized === "filme ou série"
  ) {
    return "both";
  }

  return "movie";
}

function genreIdsForSelection(genre, mediaType) {
  if (!genre) {
    return [];
  }

  if (mediaType === "tv") {
    return Array.isArray(TV_GENRE_IDS[genre])
      ? TV_GENRE_IDS[genre]
      : [];
  }

  const movieId = GENRE_IDS[genre];

  return movieId ? [movieId] : [];
}

function moodIdsForSelection(mood, mediaType) {
  if (!mood) {
    return [];
  }

  const map =
    mediaType === "tv"
      ? TV_MOOD_GENRES
      : MOOD_GENRES;

  return Array.isArray(map[mood])
    ? map[mood]
    : [];
}

function featureIdsForSelection(feature, mediaType) {
  if (!feature) {
    return [];
  }

  const map =
    mediaType === "tv"
      ? TV_FEATURE_GENRES
      : FEATURE_GENRES;

  return Array.isArray(map[feature])
    ? map[feature]
    : [];
}

function companyIdsForSelection(company, mediaType) {
  if (!company) {
    return [];
  }

  const map =
    mediaType === "tv"
      ? TV_COMPANY_GENRES
      : COMPANY_GENRES;

  return Array.isArray(map[company])
    ? map[company]
    : [];
}

function matchesEraForMedia(
  item,
  mediaType,
  era,
  currentYear,
) {
  const year = mediaYear(item, mediaType);

  if (!era || era === "Tanto faz") {
    return true;
  }

  if (year <= 0) {
    return false;
  }

  if (era === "Lançamentos") {
    return year >= currentYear - 3;
  }

  if (era === "Recentes") {
    return year >= currentYear - 15;
  }

  if (era === "Clássicos") {
    return year < currentYear - 15;
  }

  return true;
}

function scoreMediaItem({
  item,
  mediaType,
  genre,
  mood,
  era,
  duration,
  company,
  feature,
  streamingFilterApplied,
  currentYear,
}) {
  const ids = genreIdsFromMovie(item);

  let points = 0;
  let maximumPoints = 0;

  const selectedGenreIds =
    genreIdsForSelection(
      genre,
      mediaType,
    );

  if (
    genre &&
    selectedGenreIds.length > 0
  ) {
    maximumPoints += 30;

    if (
      hasIntersection(
        ids,
        selectedGenreIds,
      )
    ) {
      points += 30;
    }
  }

  const moodIds =
    moodIdsForSelection(
      mood,
      mediaType,
    );

  if (
    mood &&
    moodIds.length > 0
  ) {
    maximumPoints += 20;

    if (
      hasIntersection(
        ids,
        moodIds,
      )
    ) {
      points += 20;
    }
  }

  if (
    era &&
    era !== "Tanto faz"
  ) {
    maximumPoints += 15;

    if (
      matchesEraForMedia(
        item,
        mediaType,
        era,
        currentYear,
      )
    ) {
      points += 15;
    }
  }

  if (streamingFilterApplied) {
    maximumPoints += 20;

    // Discover já aplicou o filtro.
    points += 20;
  }

  if (
    duration &&
    duration !== "Tanto faz"
  ) {
    maximumPoints += 15;

    // Discover já aplicou a duração.
    points += 15;
  }

  if (
    company &&
    company !== "Tanto faz" &&
    company !== "Sozinho"
  ) {
    maximumPoints += 10;

    const companyIds =
      companyIdsForSelection(
        company,
        mediaType,
      );

    if (
      companyIds.length > 0 &&
      hasIntersection(
        ids,
        companyIds,
      )
    ) {
      points += 10;
    }
  } else if (
    company === "Sozinho"
  ) {
    maximumPoints += 10;
    points += 10;
  }

  const featureIds =
    featureIdsForSelection(
      feature,
      mediaType,
    );

  if (
    feature &&
    featureIds.length > 0
  ) {
    maximumPoints += 20;

    if (
      hasIntersection(
        ids,
        featureIds,
      )
    ) {
      points += 20;
    }
  }

  if (maximumPoints === 0) {
    const rating =
      Number(
        item?.vote_average ?? 0,
      );

    return Math.max(
      0,
      Math.min(
        100,
        Math.round(rating * 10),
      ),
    );
  }

  return Math.max(
    0,
    Math.min(
      100,
      Math.round(
        (points / maximumPoints) * 100,
      ),
    ),
  );
}

function getBrazilTvCertification(contentRatingsData) {
  const results =
    Array.isArray(
      contentRatingsData?.results,
    )
      ? contentRatingsData.results
      : [];

  const brazil =
    results.find(
      (item) =>
        item.iso_3166_1 === "BR" &&
        typeof item.rating === "string" &&
        item.rating.trim() !== "",
    );

  let certification =
    brazil?.rating?.trim() ?? "";

  if (!certification) {
    return "Não informada";
  }

  if (
    certification.toUpperCase() === "L"
  ) {
    return "Livre";
  }

  certification =
    certification
      .replace(/[^0-9A-Za-z+]/g, "")
      .trim();

  if (/^\d+$/.test(certification)) {
    return `${certification} anos`;
  }

  return certification || "Não informada";
}

function buildWatchObject(
  providersData,
) {
  const brazil =
    providersData?.results?.BR ?? {};

  return {
    tmdbLink:
      brazil.link ?? "",

    streaming:
      normalizeProviders(
        brazil.flatrate,
      ),

    free:
      normalizeProviders(
        brazil.free,
      ),

    ads:
      normalizeProviders(
        brazil.ads,
      ),

    rent:
      normalizeProviders(
        brazil.rent,
      ),

    buy:
      normalizeProviders(
        brazil.buy,
      ),
  };
}

function watchHasOptions(watch) {
  return Boolean(
    watch &&
      (
        watch.streaming?.length > 0 ||
        watch.free?.length > 0 ||
        watch.ads?.length > 0 ||
        watch.rent?.length > 0 ||
        watch.buy?.length > 0
      ),
  );
}

function serializeSeasonSummary(season) {
  const airDate =
    String(
      season?.air_date ?? "",
    );

  return {
    id:
      season?.id ?? null,

    number:
      Number(
        season?.season_number ?? 0,
      ),

    name:
      season?.name ?? "",

    overview:
      season?.overview ?? "",

    airDate,

    year:
      airDate.length >= 4
        ? Number(
            airDate.substring(0, 4),
          ) || 0
        : 0,

    episodeCount:
      Number(
        season?.episode_count ?? 0,
      ),

    rating:
      Number(
        season?.vote_average ?? 0,
      ),

    poster:
      season?.poster_path
        ? `https://image.tmdb.org/t/p/w500${season.poster_path}`
        : "",

    isUpcoming:
      isFutureDate(airDate),
  };
}

function serializeEpisode(episode) {
  const airDate =
    String(
      episode?.air_date ?? "",
    );

  return {
    id:
      episode?.id ?? null,

    number:
      Number(
        episode?.episode_number ?? 0,
      ),

    seasonNumber:
      Number(
        episode?.season_number ?? 0,
      ),

    name:
      episode?.name ?? "",

    overview:
      episode?.overview ?? "",

    airDate,

    runtime:
      Number(
        episode?.runtime ?? 0,
      ),

    rating:
      Number(
        episode?.vote_average ?? 0,
      ),

    voteCount:
      Number(
        episode?.vote_count ?? 0,
      ),

    still:
      episode?.still_path
        ? `https://image.tmdb.org/t/p/w780${episode.still_path}`
        : "",

    isUpcoming:
      isFutureDate(airDate),
  };
}

function normalizeSeriesListItem(series) {
  return normalizeMediaItem(
    series,
    "tv",
  );
}

function sortMatchItems(first, second) {
  if (
    second.compatibility !==
    first.compatibility
  ) {
    return (
      second.compatibility -
      first.compatibility
    );
  }

  const ratingDiff =
    Number(
      second.item?.vote_average ?? 0,
    ) -
    Number(
      first.item?.vote_average ?? 0,
    );

  if (ratingDiff !== 0) {
    return ratingDiff;
  }

  return (
    Number(
      second.item?.popularity ?? 0,
    ) -
    Number(
      first.item?.popularity ?? 0,
    )
  );
}

function chooseMixedResults(
  scored,
  limit = 12,
) {
  const movies =
    scored
      .filter(
        (entry) =>
          entry.mediaType === "movie",
      )
      .sort(sortMatchItems);

  const series =
    scored
      .filter(
        (entry) =>
          entry.mediaType === "tv",
      )
      .sort(sortMatchItems);

  // Garante variedade quando o usuário escolhe "Tanto faz":
  // tenta reservar pelo menos quatro vagas para cada tipo,
  // sem sacrificar o restante do ranking.
  const selected = [];
  const selectedKeys = new Set();

  function add(entry) {
    if (!entry) {
      return;
    }

    const key =
      `${entry.mediaType}:${entry.item?.id}`;

    if (
      !entry.item?.id ||
      selectedKeys.has(key)
    ) {
      return;
    }

    selectedKeys.add(key);
    selected.push(entry);
  }

  const minimumEach =
    Math.min(
      4,
      Math.floor(limit / 2),
    );

  for (
    let index = 0;
    index < minimumEach;
    index++
  ) {
    add(movies[index]);
    add(series[index]);
  }

  const remaining =
    scored
      .slice()
      .sort(sortMatchItems);

  for (const entry of remaining) {
    if (
      selected.length >= limit
    ) {
      break;
    }

    add(entry);
  }

  return selected
    .sort(sortMatchItems)
    .slice(0, limit);
}


export default async (request, context) => {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  const token = Netlify.env.get("TMDB_READ_TOKEN");

  if (!token) {
    return jsonResponse(
      {
        error:
          "TMDB_READ_TOKEN não foi encontrado no Netlify.",
      },
      500,
    );
  }

  const requestUrl = new URL(request.url);

  const type =
    requestUrl.searchParams.get("type") ?? "popular";

  const page =
    requestUrl.searchParams.get("page") ?? "1";

  const id =
    requestUrl.searchParams.get("id");

  async function tmdbFetch(path, params = {}) {
    const url = new URL(
      `https://api.themoviedb.org/3${path}`,
    );

    for (const [key, value] of Object.entries(params)) {
      if (
        value !== undefined &&
        value !== null &&
        value !== ""
      ) {
        url.searchParams.set(
          key,
          String(value),
        );
      }
    }

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        accept: "application/json",
      },
    });

    if (!response.ok) {
      const details = await response.text();

      throw new Error(
        `TMDB respondeu ${response.status}: ${details}`,
      );
    }

    return response.json();
  }

  try {
    // ========================================================
    // FILMES POPULARES
    // ========================================================

    if (type === "popular") {
      const data = await tmdbFetch(
        "/movie/popular",
        {
          language: "pt-BR",
          page,
        },
      );

      return jsonResponse({
        success: true,
        type: "popular",
        page: data.page,
        totalPages: data.total_pages,
        totalResults: data.total_results,
        movies: data.results,
      });
    }

    // ========================================================
    // FILMES EM CARTAZ NO BRASIL
    // ========================================================

    if (type === "now_playing") {
      const data =
        await tmdbFetch(
          "/movie/now_playing",
          {
            language: "pt-BR",
            region: "BR",
            page,
          },
        );

      const movies =
        Array.isArray(data.results)
          ? data.results.filter(
              (movie) =>
                movie?.id &&
                movie.adult !== true,
            )
          : [];

      return jsonResponse({
        success: true,
        type: "now_playing",
        page:
          data.page ?? 1,
        totalPages:
          data.total_pages ?? 0,
        totalResults:
          data.total_results ?? 0,
        movies,
      });
    }

    // ========================================================
    // PESQUISA DE FILMES
    // ========================================================

    if (type === "search") {
      const query =
        requestUrl.searchParams
          .get("query")
          ?.trim() ?? "";

      if (query.length < 2) {
        return jsonResponse({
          success: true,
          type: "search",
          page: 1,
          totalPages: 0,
          totalResults: 0,
          movies: [],
        });
      }

      const data =
        await tmdbFetch(
          "/search/movie",
          {
            language: "pt-BR",
            query,
            include_adult: false,
            page,
          },
        );

      const movies =
        Array.isArray(data.results)
          ? data.results.filter(
              (movie) =>
                movie?.id &&
                movie.adult !== true,
            )
          : [];

      return jsonResponse({
        success: true,
        type: "search",
        page:
          data.page ?? 1,
        totalPages:
          data.total_pages ?? 0,
        totalResults:
          data.total_results ?? 0,
        movies,
      });
    }

    // ========================================================
    // DETALHES DE UM FILME
    // ========================================================

    if (type === "details") {
      if (!id || !/^\d+$/.test(id)) {
        return jsonResponse(
          {
            error:
              "Informe um ID de filme válido.",
          },
          400,
        );
      }

      const [
        details,
        releaseDates,
        watchProviders,
        videosPt,
        videosEn,
      ] = await Promise.all([
        tmdbFetch(`/movie/${id}`, {
          language: "pt-BR",
        }),

        tmdbFetch(
          `/movie/${id}/release_dates`,
        ),

        tmdbFetch(
          `/movie/${id}/watch/providers`,
        ),

        tmdbFetch(`/movie/${id}/videos`, {
          language: "pt-BR",
        }),

        tmdbFetch(`/movie/${id}/videos`, {
          language: "en-US",
        }),
      ]);

      let trailer =
        getBestTrailer(videosPt);

      if (!trailer) {
        trailer = getBestTrailer(videosEn);
      }

      const certification =
        getBrazilCertification(releaseDates);

      const brazilProviders =
        watchProviders.results?.BR ?? {};

      const streaming =
        normalizeProviders(
          brazilProviders.flatrate,
        );

      const free =
        normalizeProviders(
          brazilProviders.free,
        );

      const ads =
        normalizeProviders(
          brazilProviders.ads,
        );

      const rent =
        normalizeProviders(
          brazilProviders.rent,
        );

      const buy =
        normalizeProviders(
          brazilProviders.buy,
        );

      return jsonResponse({
        success: true,
        type: "details",
        movie: {
          id: details.id,

          title: details.title ?? "",

          originalTitle:
            details.original_title ?? "",

          overview:
            details.overview ?? "",

          releaseDate:
            details.release_date ?? "",

          year:
            details.release_date &&
            details.release_date.length >= 4
              ? Number(
                  details.release_date.substring(
                    0,
                    4,
                  ),
                )
              : 0,

          rating:
            details.vote_average ?? 0,

          voteCount:
            details.vote_count ?? 0,

          runtime:
            details.runtime ?? 0,

          genres: Array.isArray(
            details.genres,
          )
            ? details.genres.map(
                (genre) => genre.name,
              )
            : [],

          poster: details.poster_path
            ? `https://image.tmdb.org/t/p/w500${details.poster_path}`
            : "",

          backdrop: details.backdrop_path
            ? `https://image.tmdb.org/t/p/original${details.backdrop_path}`
            : "",

          certification,

          trailer,

          watch: {
            tmdbLink:
              brazilProviders.link ?? "",

            streaming,

            free,

            ads,

            rent,

            buy,
          },
        },
      });
    }


    // ========================================================
    // SÉRIES POPULARES
    // ========================================================

    if (type === "tv_popular") {
      const data =
        await tmdbFetch(
          "/tv/popular",
          {
            language: "pt-BR",
            page,
          },
        );

      return jsonResponse({
        success: true,
        type: "tv_popular",
        page:
          data.page ?? 1,
        totalPages:
          data.total_pages ?? 0,
        totalResults:
          data.total_results ?? 0,
        series:
          Array.isArray(data.results)
            ? data.results.map(
                normalizeSeriesListItem,
              )
            : [],
      });
    }

    // ========================================================
    // SÉRIES MAIS BEM AVALIADAS
    // ========================================================

    if (type === "tv_top_rated") {
      const data =
        await tmdbFetch(
          "/tv/top_rated",
          {
            language: "pt-BR",
            page,
          },
        );

      return jsonResponse({
        success: true,
        type: "tv_top_rated",
        page:
          data.page ?? 1,
        totalPages:
          data.total_pages ?? 0,
        totalResults:
          data.total_results ?? 0,
        series:
          Array.isArray(data.results)
            ? data.results.map(
                normalizeSeriesListItem,
              )
            : [],
      });
    }

    // ========================================================
    // SÉRIES NO AR
    // ========================================================

    if (type === "tv_on_air") {
      const data =
        await tmdbFetch(
          "/tv/on_the_air",
          {
            language: "pt-BR",
            page,
          },
        );

      return jsonResponse({
        success: true,
        type: "tv_on_air",
        page:
          data.page ?? 1,
        totalPages:
          data.total_pages ?? 0,
        totalResults:
          data.total_results ?? 0,
        series:
          Array.isArray(data.results)
            ? data.results.map(
                normalizeSeriesListItem,
              )
            : [],
      });
    }

    // ========================================================
    // SÉRIES COM EPISÓDIO HOJE
    // ========================================================

    if (type === "tv_airing_today") {
      const data =
        await tmdbFetch(
          "/tv/airing_today",
          {
            language: "pt-BR",
            page,
            timezone:
              "America/Sao_Paulo",
          },
        );

      return jsonResponse({
        success: true,
        type: "tv_airing_today",
        page:
          data.page ?? 1,
        totalPages:
          data.total_pages ?? 0,
        totalResults:
          data.total_results ?? 0,
        series:
          Array.isArray(data.results)
            ? data.results.map(
                normalizeSeriesListItem,
              )
            : [],
      });
    }

    // ========================================================
    // SÉRIES QUE AINDA VÃO ESTREAR
    // ========================================================

    if (type === "tv_upcoming") {
      const today =
        new Date()
          .toISOString()
          .slice(0, 10);

      const data =
        await tmdbFetch(
          "/discover/tv",
          {
            language: "pt-BR",
            page,
            include_adult: false,
            sort_by:
              "first_air_date.asc",
            "first_air_date.gte":
              today,
            "vote_count.gte":
              0,
          },
        );

      const series =
        Array.isArray(data.results)
          ? data.results
              .filter(
                (item) =>
                  item?.id &&
                  isFutureDate(
                    item.first_air_date,
                  ),
              )
              .map(
                normalizeSeriesListItem,
              )
          : [];

      return jsonResponse({
        success: true,
        type: "tv_upcoming",
        page:
          data.page ?? 1,
        totalPages:
          data.total_pages ?? 0,
        totalResults:
          data.total_results ?? 0,
        series,
      });
    }

    // ========================================================
    // PESQUISA DE SÉRIES
    // ========================================================

    if (type === "tv_search") {
      const query =
        requestUrl.searchParams
          .get("query")
          ?.trim() ?? "";

      if (query.length < 2) {
        return jsonResponse({
          success: true,
          type: "tv_search",
          page: 1,
          totalPages: 0,
          totalResults: 0,
          series: [],
        });
      }

      const data =
        await tmdbFetch(
          "/search/tv",
          {
            language: "pt-BR",
            query,
            include_adult: false,
            page,
          },
        );

      return jsonResponse({
        success: true,
        type: "tv_search",
        page:
          data.page ?? 1,
        totalPages:
          data.total_pages ?? 0,
        totalResults:
          data.total_results ?? 0,
        series:
          Array.isArray(data.results)
            ? data.results
                .filter(
                  (item) =>
                    item?.id &&
                    item.adult !== true,
                )
                .map(
                  normalizeSeriesListItem,
                )
            : [],
      });
    }

    // ========================================================
    // DETALHES DE UMA SÉRIE
    // ========================================================

    if (type === "tv_details") {
      if (!id || !/^\d+$/.test(id)) {
        return jsonResponse(
          {
            error:
              "Informe um ID de série válido.",
          },
          400,
        );
      }

      const [
        details,
        contentRatings,
        watchProviders,
        videosPt,
        videosEn,
      ] = await Promise.all([
        tmdbFetch(
          `/tv/${id}`,
          {
            language: "pt-BR",
          },
        ),

        tmdbFetch(
          `/tv/${id}/content_ratings`,
        ),

        tmdbFetch(
          `/tv/${id}/watch/providers`,
        ),

        tmdbFetch(
          `/tv/${id}/videos`,
          {
            language: "pt-BR",
          },
        ),

        tmdbFetch(
          `/tv/${id}/videos`,
          {
            language: "en-US",
          },
        ),
      ]);

      let trailer =
        getBestTrailer(
          videosPt,
        );

      if (!trailer) {
        trailer =
          getBestTrailer(
            videosEn,
          );
      }

      const certification =
        getBrazilTvCertification(
          contentRatings,
        );

      const allSeasons =
        Array.isArray(
          details.seasons,
        )
          ? details.seasons
          : [];

      const seasons =
        allSeasons
          .filter(
            (season) =>
              Number(
                season?.season_number ?? 0,
              ) > 0,
          )
          .map(
            serializeSeasonSummary,
          )
          .sort(
            (first, second) =>
              first.number -
              second.number,
          );

      const specials =
        allSeasons
          .filter(
            (season) =>
              Number(
                season?.season_number ?? 0,
              ) === 0,
          )
          .map(
            serializeSeasonSummary,
          );

      const nextUpcomingSeason =
        seasons
          .filter(
            (season) =>
              season.isUpcoming,
          )
          .sort(
            (first, second) =>
              String(first.airDate)
                .localeCompare(
                  String(
                    second.airDate,
                  ),
                ),
          )[0] ?? null;

      const firstAirDate =
        String(
          details.first_air_date ?? "",
        );

      const lastAirDate =
        String(
          details.last_air_date ?? "",
        );

      return jsonResponse({
        success: true,
        type: "tv_details",

        series: {
          id:
            details.id,

          mediaType:
            "tv",

          name:
            details.name ?? "",

          title:
            details.name ?? "",

          originalName:
            details.original_name ?? "",

          originalTitle:
            details.original_name ?? "",

          overview:
            details.overview ?? "",

          firstAirDate,

          releaseDate:
            firstAirDate,

          lastAirDate,

          year:
            firstAirDate.length >= 4
              ? Number(
                  firstAirDate.substring(
                    0,
                    4,
                  ),
                ) || 0
              : 0,

          rating:
            Number(
              details.vote_average ?? 0,
            ),

          voteCount:
            Number(
              details.vote_count ?? 0,
            ),

          genres:
            Array.isArray(
              details.genres,
            )
              ? details.genres.map(
                  (genre) =>
                    genre.name,
                )
              : [],

          poster:
            details.poster_path
              ? `https://image.tmdb.org/t/p/w500${details.poster_path}`
              : "",

          backdrop:
            details.backdrop_path
              ? `https://image.tmdb.org/t/p/original${details.backdrop_path}`
              : "",

          certification,

          trailer,

          status:
            details.status ?? "",

          type:
            details.type ?? "",

          inProduction:
            details.in_production === true,

          numberOfSeasons:
            Number(
              details.number_of_seasons ?? seasons.length,
            ),

          numberOfEpisodes:
            Number(
              details.number_of_episodes ?? 0,
            ),

          episodeRuntime:
            Array.isArray(
              details.episode_run_time,
            )
              ? details.episode_run_time
                  .map(
                    (runtime) =>
                      Number(runtime),
                  )
                  .filter(
                    (runtime) =>
                      Number.isFinite(runtime) &&
                      runtime > 0,
                  )
              : [],

          networks:
            Array.isArray(
              details.networks,
            )
              ? details.networks.map(
                  (network) => ({
                    id:
                      network.id,

                    name:
                      network.name ?? "",

                    logo:
                      network.logo_path
                        ? `https://image.tmdb.org/t/p/w185${network.logo_path}`
                        : "",
                  }),
                )
              : [],

          createdBy:
            Array.isArray(
              details.created_by,
            )
              ? details.created_by.map(
                  (person) => ({
                    id:
                      person.id,

                    name:
                      person.name ?? "",

                    image:
                      person.profile_path
                        ? `https://image.tmdb.org/t/p/w185${person.profile_path}`
                        : "",
                  }),
                )
              : [],

          originCountries:
            Array.isArray(
              details.origin_country,
            )
              ? details.origin_country
              : [],

          homepage:
            details.homepage ?? "",

          watch:
            buildWatchObject(
              watchProviders,
            ),

          seasons,

          specials,

          isUpcoming:
            isFutureDate(
              firstAirDate,
            ),

          hasUpcomingSeason:
            nextUpcomingSeason !== null,

          nextUpcomingSeason,

          nextEpisode:
            details.next_episode_to_air
              ? serializeEpisode(
                  details.next_episode_to_air,
                )
              : null,

          lastEpisode:
            details.last_episode_to_air
              ? serializeEpisode(
                  details.last_episode_to_air,
                )
              : null,
        },
      });
    }

    // ========================================================
    // DETALHES DE UMA TEMPORADA
    // ========================================================

    if (type === "tv_season") {
      const seasonParam =
        requestUrl.searchParams.get(
          "season",
        ) ??
        requestUrl.searchParams.get(
          "seasonNumber",
        ) ??
        "";

      if (!id || !/^\d+$/.test(id)) {
        return jsonResponse(
          {
            error:
              "Informe um ID de série válido.",
          },
          400,
        );
      }

      if (!/^\d+$/.test(seasonParam)) {
        return jsonResponse(
          {
            error:
              "Informe uma temporada válida.",
          },
          400,
        );
      }

      const seasonNumber =
        Number(
          seasonParam,
        );

      const [
        seasonPt,
        seasonEn,
        seasonProviders,
        seriesProviders,
      ] = await Promise.all([
        tmdbFetch(
          `/tv/${id}/season/${seasonNumber}`,
          {
            language: "pt-BR",
          },
        ),

        tmdbFetch(
          `/tv/${id}/season/${seasonNumber}`,
          {
            language: "en-US",
          },
        ),

        tmdbFetch(
          `/tv/${id}/season/${seasonNumber}/watch/providers`,
        ),

        tmdbFetch(
          `/tv/${id}/watch/providers`,
        ),
      ]);

      const overview =
        String(
          seasonPt.overview ?? "",
        ).trim() ||
        String(
          seasonEn.overview ?? "",
        ).trim();

      const name =
        String(
          seasonPt.name ?? "",
        ).trim() ||
        String(
          seasonEn.name ?? "",
        ).trim() ||
        `Temporada ${seasonNumber}`;

      const airDate =
        String(
          seasonPt.air_date ??
            seasonEn.air_date ??
            "",
        );

      const episodesPt =
        Array.isArray(
          seasonPt.episodes,
        )
          ? seasonPt.episodes
          : [];

      const episodesEn =
        Array.isArray(
          seasonEn.episodes,
        )
          ? seasonEn.episodes
          : [];

      const englishByNumber =
        new Map(
          episodesEn.map(
            (episode) => [
              Number(
                episode.episode_number ?? 0,
              ),
              episode,
            ],
          ),
        );

      const episodes =
        episodesPt.map(
          (episode) => {
            const english =
              englishByNumber.get(
                Number(
                  episode.episode_number ?? 0,
                ),
              );

            return serializeEpisode({
              ...episode,

              name:
                String(
                  episode.name ?? "",
                ).trim() ||
                String(
                  english?.name ?? "",
                ).trim(),

              overview:
                String(
                  episode.overview ?? "",
                ).trim() ||
                String(
                  english?.overview ?? "",
                ).trim(),

              runtime:
                episode.runtime ??
                english?.runtime ??
                0,

              still_path:
                episode.still_path ??
                english?.still_path ??
                null,
            });
          },
        );

      const seasonWatch =
        buildWatchObject(
          seasonProviders,
        );

      const seriesWatch =
        buildWatchObject(
          seriesProviders,
        );

      const effectiveWatch =
        watchHasOptions(
          seasonWatch,
        )
          ? seasonWatch
          : seriesWatch;

      return jsonResponse({
        success: true,
        type: "tv_season",

        season: {
          id:
            seasonPt.id ??
            seasonEn.id ??
            null,

          seriesId:
            Number(id),

          number:
            seasonNumber,

          name,

          overview,

          airDate,

          year:
            airDate.length >= 4
              ? Number(
                  airDate.substring(
                    0,
                    4,
                  ),
                ) || 0
              : 0,

          rating:
            Number(
              seasonPt.vote_average ??
                seasonEn.vote_average ??
                0,
            ),

          poster:
            seasonPt.poster_path
              ? `https://image.tmdb.org/t/p/w500${seasonPt.poster_path}`
              : seasonEn.poster_path
                ? `https://image.tmdb.org/t/p/w500${seasonEn.poster_path}`
                : "",

          episodeCount:
            episodes.length,

          episodes,

          isUpcoming:
            isFutureDate(
              airDate,
            ),

          watch:
            effectiveWatch,

          watchSource:
            watchHasOptions(
              seasonWatch,
            )
              ? "season"
              : watchHasOptions(
                  seriesWatch,
                )
                ? "series"
                : "none",
        },
      });
    }


    // ========================================================
    // MOVIE MATCH — FILME / SÉRIE / TANTO FAZ
    // ========================================================


    // ===========================================================
    // STREAMINGS DISPONÍVEIS NO BRASIL
    // ===========================================================

    if (type === "streaming_providers") {
      const preferredProviders = [
        "Netflix",
        "Prime Video",
        "Disney+",
        "Max",
        "Globoplay",
        "Apple TV+",
        "Paramount+",
        "Crunchyroll",
        "MUBI",
        "Universal+",
        "Claro tv+",
      ];

      const [movieProviderData, tvProviderData] =
        await Promise.all([
          tmdbFetch("/watch/providers/movie", {
            language: "pt-BR",
            watch_region: "BR",
          }),
          tmdbFetch("/watch/providers/tv", {
            language: "pt-BR",
            watch_region: "BR",
          }),
        ]);

      const movieProviders =
        Array.isArray(movieProviderData.results)
          ? movieProviderData.results
          : [];

      const tvProviders =
        Array.isArray(tvProviderData.results)
          ? tvProviderData.results
          : [];

      const providers = [];

      for (const displayName of preferredProviders) {
        const movieMatches =
          movieProviders.filter((provider) =>
            providerMatchesDirectStreaming(
              displayName,
              provider.provider_name,
            ),
          );

        const tvMatches =
          tvProviders.filter((provider) =>
            providerMatchesDirectStreaming(
              displayName,
              provider.provider_name,
            ),
          );

        if (
          movieMatches.length === 0 &&
          tvMatches.length === 0
        ) {
          continue;
        }

        const representative =
          movieMatches[0] ?? tvMatches[0];

        providers.push({
          name: displayName,
          movieProviderIds: uniqueStrings(
            movieMatches.map((provider) =>
              String(provider.provider_id),
            ),
          ).map(Number),
          tvProviderIds: uniqueStrings(
            tvMatches.map((provider) =>
              String(provider.provider_id),
            ),
          ).map(Number),
          logo: representative?.logo_path
            ? `https://image.tmdb.org/t/p/w185${representative.logo_path}`
            : "",
          originalName:
            representative?.provider_name ?? displayName,
        });
      }

      return jsonResponse({
        success: true,
        type: "streaming_providers",
        region: "BR",
        providers,
      });
    }

    // ===========================================================
    // CATÁLOGO DE UM STREAMING
    // ===========================================================

    if (type === "streaming_catalog") {
      const providerName =
        (
          requestUrl.searchParams.get("provider") ?? ""
        ).trim();

      if (!providerName) {
        return jsonResponse(
          {
            success: false,
            error: "O streaming não foi informado.",
          },
          400,
        );
      }

      const mediaPreference =
        normalizeMediaPreference(
          requestUrl.searchParams.get("media") ?? "both",
        );

      const searchQuery =
        (
          requestUrl.searchParams.get("query") ?? ""
        ).trim();

      const requestedPage =
        Math.max(
          1,
          Number(
            requestUrl.searchParams.get("page") ?? 1,
          ) || 1,
        );

      const wantedMediaTypes =
        mediaPreference === "both"
          ? ["movie", "tv"]
          : [mediaPreference];

      async function providerIdsForCatalog(mediaType) {
        const providerData =
          await tmdbFetch(
            mediaType === "tv"
              ? "/watch/providers/tv"
              : "/watch/providers/movie",
            {
              language: "pt-BR",
              watch_region: "BR",
            },
          );

        const providers =
          Array.isArray(providerData.results)
            ? providerData.results
            : [];

        return uniqueStrings(
          providers
            .filter((provider) =>
              providerMatchesDirectStreaming(
                providerName,
                provider.provider_name,
              ),
            )
            .map((provider) =>
              String(provider.provider_id),
            ),
        ).map(Number);
      }

      async function isAvailableOnProvider({
        id,
        mediaType,
        providerIds,
      }) {
        if (providerIds.length === 0) {
          return false;
        }

        try {
          const data =
            await tmdbFetch(
              mediaType === "tv"
                ? `/tv/${id}/watch/providers`
                : `/movie/${id}/watch/providers`,
            );

          const br = data.results?.BR ?? {};
          const groups = [
            br.flatrate,
            br.free,
            br.ads,
          ];

          for (const group of groups) {
            if (!Array.isArray(group)) {
              continue;
            }

            if (
              group.some((provider) =>
                providerIds.includes(
                  Number(provider.provider_id),
                ),
              )
            ) {
              return true;
            }
          }
        } catch (_) {
          return false;
        }

        return false;
      }

      async function discoverStreamingCatalog(
        mediaType,
        providerIds,
      ) {
        if (providerIds.length === 0) {
          return [];
        }

        const all = [];

        for (
          let discoverPage = 1;
          discoverPage <= 2;
          discoverPage++
        ) {
          const data =
            await tmdbFetch(
              mediaType === "tv"
                ? "/discover/tv"
                : "/discover/movie",
              {
                language: "pt-BR",
                include_adult: false,
                page:
                  (requestedPage - 1) * 2 +
                  discoverPage,
                sort_by: "popularity.desc",
                "vote_count.gte": 20,
                watch_region: "BR",
                with_watch_providers:
                  providerIds.join("|"),
                with_watch_monetization_types:
                  "flatrate|free|ads",
              },
            );

          const results =
            Array.isArray(data.results)
              ? data.results
              : [];

          all.push(...results);
        }

        return all;
      }

      async function searchStreamingCatalog(
        mediaType,
        providerIds,
      ) {
        if (
          providerIds.length === 0 ||
          searchQuery.length < 2
        ) {
          return [];
        }

        const data =
          await tmdbFetch(
            mediaType === "tv"
              ? "/search/tv"
              : "/search/movie",
            {
              language: "pt-BR",
              include_adult: false,
              query: searchQuery,
              page: requestedPage,
            },
          );

        const candidates =
          (
            Array.isArray(data.results)
              ? data.results
              : []
          )
            .filter(
              (item) =>
                item?.id &&
                item.adult !== true,
            )
            .slice(0, 20);

        const checks =
          await Promise.all(
            candidates.map(async (item) => {
              const available =
                await isAvailableOnProvider({
                  id: item.id,
                  mediaType,
                  providerIds,
                });

              return available ? item : null;
            }),
          );

        return checks.filter(Boolean);
      }

      const groups =
        await Promise.all(
          wantedMediaTypes.map(async (mediaType) => {
            const providerIds =
              await providerIdsForCatalog(mediaType);

            const items =
              searchQuery.length >= 2
                ? await searchStreamingCatalog(
                    mediaType,
                    providerIds,
                  )
                : await discoverStreamingCatalog(
                    mediaType,
                    providerIds,
                  );

            return items.map((item) =>
              normalizeMediaItem(item, mediaType),
            );
          }),
        );

      const unique = new Map();

      for (const group of groups) {
        for (const item of group) {
          const key =
            `${item.mediaType}:${item.id}`;

          if (
            item?.id &&
            item.adult !== true &&
            !unique.has(key)
          ) {
            unique.set(key, item);
          }
        }
      }

      const results = [...unique.values()];

      if (searchQuery.length < 2) {
        results.sort((a, b) => {
          function score(item) {
            const rating =
              Number(item.vote_average ?? 0);
            const votes =
              Number(item.vote_count ?? 0);
            const popularity =
              Number(item.popularity ?? 0);

            return (
              rating * 13 +
              Math.log(votes + 1) * 5.2 +
              Math.log(popularity + 1) * 4.2
            );
          }

          return score(b) - score(a);
        });
      }

      return jsonResponse({
        success: true,
        type: "streaming_catalog",
        provider: providerName,
        mediaPreference,
        query: searchQuery,
        region: "BR",
        results: results.slice(0, 36),
      });
    }

    if (type === "match") {
      const mediaPreference =
        normalizeMediaPreference(
          requestUrl.searchParams.get(
            "media",
          ) ??
          requestUrl.searchParams.get(
            "mediaType",
          ) ??
          requestUrl.searchParams.get(
            "contentType",
          ) ??
          "movie",
        );

      const genre =
        requestUrl.searchParams.get("genre") ?? "";

      const mood =
        requestUrl.searchParams.get("mood") ?? "";

      const era =
        requestUrl.searchParams.get("era") ?? "";

      const duration =
        requestUrl.searchParams.get("duration") ?? "";

      const company =
        requestUrl.searchParams.get("company") ?? "";

      const feature =
        requestUrl.searchParams.get("feature") ?? "";

      const streamingsParam =
        requestUrl.searchParams.get("streamings") ?? "";

      const selectedStreamings =
        streamingsParam
          .split("|")
          .map(
            (item) =>
              item.trim(),
          )
          .filter(
            (item) =>
              item.length > 0 &&
              normalizeText(item) !== "outro",
          );

      const currentYear =
        new Date().getFullYear();

      const today =
        new Date()
          .toISOString()
          .slice(0, 10);

      const wantedMediaTypes =
        mediaPreference === "both"
          ? ["movie", "tv"]
          : [mediaPreference];

      async function providerIdsFor(
        mediaType,
      ) {
        if (
          selectedStreamings.length === 0
        ) {
          return [];
        }

        try {
          const providerData =
            await tmdbFetch(
              mediaType === "tv"
                ? "/watch/providers/tv"
                : "/watch/providers/movie",
              {
                language: "pt-BR",
                watch_region: "BR",
              },
            );

          const providers =
            Array.isArray(
              providerData.results,
            )
              ? providerData.results
              : [];

          return uniqueStrings(
            providers
              .filter(
                (provider) =>
                  selectedStreamings.some(
                    (selected) =>
                      providerMatchesSelection(
                        selected,
                        provider.provider_name,
                      ),
                  ),
              )
              .map(
                (provider) =>
                  String(
                    provider.provider_id,
                  ),
              ),
          );
        } catch (_) {
          return [];
        }
      }

      function buildDiscoverParams(
        mediaType,
        selectedProviderIds,
      ) {
        const params = {
          language: "pt-BR",
          include_adult: false,
          sort_by: "popularity.desc",
          "vote_count.gte": 30,
        };

        if (mediaType === "movie") {
          params.include_video = false;
        } else {
          params.include_null_first_air_dates = false;
        }

        const selectedGenreIds =
          genreIdsForSelection(
            genre,
            mediaType,
          );

        if (
          selectedGenreIds.length > 0
        ) {
          params.with_genres =
            selectedGenreIds.join("|");
        }

        if (mediaType === "tv") {
          if (era === "Lançamentos") {
            params[
              "first_air_date.gte"
            ] = `${currentYear - 3}-01-01`;

            params[
              "first_air_date.lte"
            ] = today;
          } else if (
            era === "Recentes"
          ) {
            params[
              "first_air_date.gte"
            ] = `${currentYear - 15}-01-01`;

            params[
              "first_air_date.lte"
            ] = today;
          } else if (
            era === "Clássicos"
          ) {
            params[
              "first_air_date.lte"
            ] = `${currentYear - 16}-12-31`;
          }

          // Para séries a duração representa, na prática,
          // a duração aproximada de um episódio.
          if (duration === "Curto") {
            params[
              "with_runtime.lte"
            ] = 30;
          } else if (
            duration === "Médio"
          ) {
            params[
              "with_runtime.gte"
            ] = 31;

            params[
              "with_runtime.lte"
            ] = 60;
          } else if (
            duration === "Longo"
          ) {
            params[
              "with_runtime.gte"
            ] = 61;
          }
        } else {
          if (era === "Lançamentos") {
            params[
              "primary_release_date.gte"
            ] = `${currentYear - 3}-01-01`;

            params[
              "primary_release_date.lte"
            ] = today;
          } else if (
            era === "Recentes"
          ) {
            params[
              "primary_release_date.gte"
            ] = `${currentYear - 15}-01-01`;

            params[
              "primary_release_date.lte"
            ] = today;
          } else if (
            era === "Clássicos"
          ) {
            params[
              "primary_release_date.lte"
            ] = `${currentYear - 16}-12-31`;
          }

          if (duration === "Curto") {
            params[
              "with_runtime.lte"
            ] = 100;
          } else if (
            duration === "Médio"
          ) {
            params[
              "with_runtime.gte"
            ] = 101;

            params[
              "with_runtime.lte"
            ] = 150;
          } else if (
            duration === "Longo"
          ) {
            params[
              "with_runtime.gte"
            ] = 151;
          }
        }

        const streamingFilterApplied =
          selectedProviderIds.length > 0;

        if (streamingFilterApplied) {
          params.watch_region = "BR";

          params.with_watch_providers =
            selectedProviderIds.join("|");

          params[
            "with_watch_monetization_types"
          ] = "flatrate|free|ads";
        }

        return {
          params,
          streamingFilterApplied,
        };
      }

      async function discoverCandidatesFor(
        mediaType,
        params,
        pageCount,
      ) {
        const all = [];

        for (
          let discoverPage = 1;
          discoverPage <= pageCount;
          discoverPage++
        ) {
          const data =
            await tmdbFetch(
              mediaType === "tv"
                ? "/discover/tv"
                : "/discover/movie",
              {
                ...params,
                page: discoverPage,
              },
            );

          const results =
            Array.isArray(
              data.results,
            )
              ? data.results
              : [];

          all.push(...results);

          if (
            discoverPage >=
            Number(
              data.total_pages ?? 1,
            )
          ) {
            break;
          }
        }

        const unique =
          new Map();

        for (const item of all) {
          if (
            item?.id &&
            item.adult !== true &&
            !unique.has(item.id)
          ) {
            unique.set(
              item.id,
              item,
            );
          }
        }

        return [
          ...unique.values(),
        ];
      }

      async function candidatesFor(
        mediaType,
      ) {
        const selectedProviderIds =
          await providerIdsFor(
            mediaType,
          );

        let {
          params,
          streamingFilterApplied,
        } =
          buildDiscoverParams(
            mediaType,
            selectedProviderIds,
          );

        const pageCount =
          mediaPreference === "both"
            ? 2
            : 3;

        let candidates =
          await discoverCandidatesFor(
            mediaType,
            params,
            pageCount,
          );

        // Primeiro relaxa apenas o streaming.
        if (
          candidates.length === 0 &&
          streamingFilterApplied
        ) {
          params = {
            ...params,
          };

          delete params.watch_region;
          delete params.with_watch_providers;
          delete params[
            "with_watch_monetization_types"
          ];

          streamingFilterApplied = false;

          candidates =
            await discoverCandidatesFor(
              mediaType,
              params,
              pageCount,
            );
        }

        // Depois relaxa duração.
        if (
          candidates.length === 0
        ) {
          params = {
            ...params,
          };

          delete params[
            "with_runtime.gte"
          ];

          delete params[
            "with_runtime.lte"
          ];

          candidates =
            await discoverCandidatesFor(
              mediaType,
              params,
              pageCount,
            );
        }

        return {
          candidates,
          streamingFilterApplied,
        };
      }

      const candidateGroups =
        await Promise.all(
          wantedMediaTypes.map(
            async (mediaType) => {
              const result =
                await candidatesFor(
                  mediaType,
                );

              return {
                mediaType,
                ...result,
              };
            },
          ),
        );

      const scored = [];

      for (
        const group of candidateGroups
      ) {
        for (
          const item of group.candidates
        ) {
          scored.push({
            item,
            mediaType:
              group.mediaType,
            compatibility:
              scoreMediaItem({
                item,
                mediaType:
                  group.mediaType,
                genre,
                mood,
                era,
                duration,
                company,
                feature,
                streamingFilterApplied:
                  group.streamingFilterApplied,
                currentYear,
              }),
          });
        }
      }

      const chosen =
        mediaPreference === "both"
          ? chooseMixedResults(
              scored,
              12,
            )
          : scored
              .sort(
                sortMatchItems,
              )
              .slice(
                0,
                12,
              );

      const enriched =
        await Promise.all(
          chosen.map(
            async ({
              item,
              mediaType,
              compatibility,
            }) => {
              let providers = [];

              try {
                const providerData =
                  await tmdbFetch(
                    mediaType === "tv"
                      ? `/tv/${item.id}/watch/providers`
                      : `/movie/${item.id}/watch/providers`,
                  );

                const br =
                  providerData.results?.BR ??
                  {};

                providers =
                  uniqueStrings([
                    ...(Array.isArray(
                      br.flatrate,
                    )
                      ? br.flatrate.map(
                          (provider) =>
                            provider.provider_name,
                        )
                      : []),

                    ...(Array.isArray(
                      br.free,
                    )
                      ? br.free.map(
                          (provider) =>
                            provider.provider_name,
                        )
                      : []),

                    ...(Array.isArray(
                      br.ads,
                    )
                      ? br.ads.map(
                          (provider) =>
                            provider.provider_name,
                        )
                      : []),
                  ]);
              } catch (_) {
                providers = [];
              }

              return {
                ...normalizeMediaItem(
                  item,
                  mediaType,
                ),

                compatibility,

                streamings:
                  providers,
              };
            },
          ),
        );

      const candidateCount =
        candidateGroups.reduce(
          (
            total,
            group,
          ) =>
            total +
            group.candidates.length,
          0,
        );

      const streamingFilterApplied =
        candidateGroups.some(
          (group) =>
            group.streamingFilterApplied,
        );

      return jsonResponse({
        success: true,
        type: "match",

        mediaPreference,

        candidateCount,

        streamingFilterApplied,

        // Mantemos "movies" por compatibilidade com o Flutter
        // atual. Ele passará a conter filmes OU séries.
        movies:
          enriched,

        results:
          enriched,
      });
    }

    // ========================================================
    // TIPO DESCONHECIDO
    // ========================================================

    return jsonResponse(
      {
        error:
          "Tipo de consulta inválido.",
      },
      400,
    );
  } catch (error) {
    return jsonResponse(
      {
        error:
          "Erro ao consultar a TMDB.",
        details: error.message,
      },
      500,
    );
  }
};
