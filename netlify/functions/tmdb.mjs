const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
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

// ============================================================
// ESCOLHE A CLASSIFICAÇÃO INDICATIVA DO BRASIL
// ============================================================

function getBrazilCertification(releaseDatesData) {
  const brazil = releaseDatesData.results?.find(
    (country) => country.iso_3166_1 === "BR",
  );

  if (!brazil || !Array.isArray(brazil.release_dates)) {
    return "Não informada";
  }

  const releases = brazil.release_dates;

  // Ordem de preferência:
  // 3 = cinema
  // 4 = digital
  // 6 = TV
  // 2 = cinema limitado
  // 1 = estreia
  // 5 = mídia física
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

// ============================================================
// ESCOLHE O MELHOR TRAILER
// ============================================================

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
    (video) => video.type === "Trailer" && video.official === true,
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

// ============================================================
// ORGANIZA OS STREAMINGS
// ============================================================

function normalizeProviders(list) {
  if (!Array.isArray(list)) {
    return [];
  }

  return list.map((provider) => ({
    id: provider.provider_id,
    name: provider.provider_name,
    logo:
      provider.logo_path
        ? `https://image.tmdb.org/t/p/w185${provider.logo_path}`
        : "",
  }));
}

// ============================================================
// FUNÇÃO PRINCIPAL
// ============================================================

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
        error: "TMDB_READ_TOKEN não foi encontrado no Netlify.",
      },
      500,
    );
  }

  const requestUrl = new URL(request.url);

  const type = requestUrl.searchParams.get("type") ?? "popular";
  const page = requestUrl.searchParams.get("page") ?? "1";
  const id = requestUrl.searchParams.get("id");

  // ==========================================================
  // FUNÇÃO INTERNA PARA CHAMAR A TMDB
  // ==========================================================

  async function tmdbFetch(path, params = {}) {
    const url = new URL(
      `https://api.themoviedb.org/3${path}`,
    );

    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
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
      const data = await tmdbFetch("/movie/popular", {
        language: "pt-BR",
        page,
      });

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
    // DETALHES DE UM FILME
    // ========================================================

    if (type === "details") {
      if (!id || !/^\d+$/.test(id)) {
        return jsonResponse(
          {
            error: "Informe um ID de filme válido.",
          },
          400,
        );
      }

      // Fazemos várias consultas ao mesmo tempo.
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

        tmdbFetch(`/movie/${id}/release_dates`),

        tmdbFetch(`/movie/${id}/watch/providers`),

        tmdbFetch(`/movie/${id}/videos`, {
          language: "pt-BR",
        }),

        tmdbFetch(`/movie/${id}/videos`, {
          language: "en-US",
        }),
      ]);

      // ======================================================
      // TRAILER
      // ======================================================

      let trailer = getBestTrailer(videosPt);

      if (!trailer) {
        trailer = getBestTrailer(videosEn);
      }

      // ======================================================
      // CLASSIFICAÇÃO
      // ======================================================

      const certification =
        getBrazilCertification(releaseDates);

      // ======================================================
      // ONDE ASSISTIR NO BRASIL
      // ======================================================

      const brazilProviders =
        watchProviders.results?.BR ?? {};

      const streaming =
        normalizeProviders(brazilProviders.flatrate);

      const free =
        normalizeProviders(brazilProviders.free);

      const ads =
        normalizeProviders(brazilProviders.ads);

      const rent =
        normalizeProviders(brazilProviders.rent);

      const buy =
        normalizeProviders(brazilProviders.buy);

      // ======================================================
      // RESPOSTA FINAL
      // ======================================================

      return jsonResponse({
        success: true,

        type: "details",

        movie: {
          id: details.id,

          title: details.title ?? "",

          originalTitle: details.original_title ?? "",

          overview: details.overview ?? "",

          releaseDate: details.release_date ?? "",

          year:
            details.release_date &&
            details.release_date.length >= 4
              ? Number(details.release_date.substring(0, 4))
              : 0,

          rating: details.vote_average ?? 0,

          voteCount: details.vote_count ?? 0,

          runtime: details.runtime ?? 0,

          genres:
            Array.isArray(details.genres)
              ? details.genres.map((genre) => genre.name)
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

          watch: {
            tmdbLink: brazilProviders.link ?? "",

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
    // TIPO DESCONHECIDO
    // ========================================================

    return jsonResponse(
      {
        error: "Tipo de consulta inválido.",
      },
      400,
    );
  } catch (error) {
    return jsonResponse(
      {
        error: "Erro ao consultar a TMDB.",
        details: error.message,
      },
      500,
    );
  }
};
