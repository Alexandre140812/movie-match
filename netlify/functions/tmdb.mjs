const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const GENRES = {
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

const MOODS = {
  "Divertido": [35, 16, 10751],
  "Emocionante": [18, 12, 10749],
  "Tenso": [53, 27, 80, 28],
  "Relaxante": [35, 10751, 16, 10749],
  "Misterioso": [9648, 53, 80],
  "Inspirador": [18, 36, 99, 10402],
};

const FEATURES = {
  "História": [18, 36, 9648],
  "Ação": [28, 12],
  "Personagens": [18, 35, 10749],
  "Humor": [35, 16],
  "Visual": [878, 14, 16, 12],
  "Suspense": [53, 9648, 27],
  "Música": [10402],
};

const COMPANY = {
  "Família": [10751, 16, 35, 12],
  "Amigos": [28, 35, 27, 12, 16],
  "Casal": [10749, 35, 18],
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...CORS,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

function normalize(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function ids(movie) {
  return Array.isArray(movie?.genre_ids)
    ? movie.genre_ids
        .map(Number)
        .filter(Number.isFinite)
    : [];
}

function shares(first, second) {
  const set = new Set(first);

  return second.some(
    (value) => set.has(value),
  );
}

function yearOf(movie) {
  const date = String(
    movie?.release_date ?? "",
  );

  return date.length >= 4
    ? Number(date.slice(0, 4)) || 0
    : 0;
}

function formatCertification(data) {
  const br = data?.results?.find(
    (item) =>
      item.iso_3166_1 === "BR",
  );

  if (
    !br ||
    !Array.isArray(br.release_dates)
  ) {
    return "Não informada";
  }

  const order = [3, 4, 6, 2, 1, 5];

  let value = "";

  for (const type of order) {
    const found =
      br.release_dates.find(
        (item) =>
          item.type === type &&
          typeof item.certification ===
            "string" &&
          item.certification.trim(),
      );

    if (found) {
      value =
        found.certification.trim();

      break;
    }
  }

  if (!value) {
    value =
      br.release_dates.find(
        (item) =>
          typeof item.certification ===
            "string" &&
          item.certification.trim(),
      )?.certification?.trim() ?? "";
  }

  if (!value) {
    return "Não informada";
  }

  if (
    value.toUpperCase() === "L"
  ) {
    return "Livre";
  }

  if (/^\d+$/.test(value)) {
    return `${value} anos`;
  }

  return value;
}

function trailerUrl(data) {
  const list =
    Array.isArray(data?.results)
      ? data.results
      : [];

  const youtube =
    list.filter(
      (item) =>
        item.site === "YouTube" &&
        typeof item.key === "string" &&
        item.key,
    );

  const chosen =
    youtube.find(
      (item) =>
        item.type === "Trailer" &&
        item.official,
    ) ??
    youtube.find(
      (item) =>
        item.type === "Trailer",
    ) ??
    youtube.find(
      (item) =>
        item.type === "Teaser",
    ) ??
    youtube[0];

  return chosen
    ? `https://www.youtube.com/watch?v=${chosen.key}`
    : "";
}

function providers(list) {
  if (!Array.isArray(list)) {
    return [];
  }

  return list.map(
    (item) => ({
      id:
        item.provider_id,

      name:
        item.provider_name,

      logo:
        item.logo_path
          ? `https://image.tmdb.org/t/p/w185${item.logo_path}`
          : "",
    }),
  );
}

function providerMatches(
  selectedName,
  providerName,
) {
  const selected =
    normalize(selectedName);

  const provider =
    normalize(providerName);

  if (
    !selected ||
    selected === "outro"
  ) {
    return false;
  }

  if (selected === "netflix") {
    return provider.includes(
      "netflix",
    );
  }

  if (
    selected === "prime video"
  ) {
    return (
      provider.includes(
        "amazon prime video",
      ) ||
      provider.includes(
        "prime video",
      )
    );
  }

  if (selected === "disney+") {
    return (
      provider.includes(
        "disney plus",
      ) ||
      provider.includes(
        "disney+",
      )
    );
  }

  if (
    selected === "hbo max" ||
    selected === "max"
  ) {
    return (
      provider === "max" ||
      provider.includes(
        "hbo max",
      )
    );
  }

  if (
    selected === "globoplay"
  ) {
    return provider.includes(
      "globoplay",
    );
  }

  if (
    selected === "apple tv+"
  ) {
    return (
      provider.includes(
        "apple tv plus",
      ) ||
      provider.includes(
        "apple tv+",
      )
    );
  }

  if (
    selected === "paramount+"
  ) {
    return (
      provider.includes(
        "paramount plus",
      ) ||
      provider.includes(
        "paramount+",
      )
    );
  }

  if (
    selected === "crunchyroll"
  ) {
    return provider.includes(
      "crunchyroll",
    );
  }

  if (
    selected === "universal+"
  ) {
    return (
      provider.includes(
        "universal+",
      ) ||
      provider.includes(
        "universal plus",
      )
    );
  }

  if (
    selected === "claro tv+"
  ) {
    return (
      provider.includes(
        "claro tv",
      ) ||
      provider.includes(
        "claro video",
      )
    );
  }

  return provider.includes(
    selected,
  );
}

function scoreMovie(
  movie,
  answers,
) {
  const movieGenres =
    ids(movie);

  let points = 0;
  let max = 0;

  const wantedGenre =
    GENRES[answers.genre];

  if (wantedGenre) {
    max += 30;

    if (
      movieGenres.includes(
        wantedGenre,
      )
    ) {
      points += 30;
    }
  }

  if (
    MOODS[answers.mood]
  ) {
    max += 20;

    if (
      shares(
        movieGenres,
        MOODS[answers.mood],
      )
    ) {
      points += 20;
    }
  }

  if (
    answers.era &&
    answers.era !== "Tanto faz"
  ) {
    max += 15;

    const year =
      yearOf(movie);

    const now =
      new Date().getFullYear();

    if (
      (
        answers.era ===
          "Lançamentos" &&
        year >= now - 3
      ) ||
      (
        answers.era ===
          "Recentes" &&
        year >= now - 15
      ) ||
      (
        answers.era ===
          "Clássicos" &&
        year > 0 &&
        year < now - 15
      )
    ) {
      points += 15;
    }
  }

  if (
    answers.streamingFilterApplied
  ) {
    max += 20;
    points += 20;
  }

  if (
    answers.duration &&
    answers.duration !==
      "Tanto faz"
  ) {
    max += 15;

    if (
      answers.durationFilterApplied
    ) {
      points += 15;
    }
  }

  if (
    answers.company ===
    "Sozinho"
  ) {
    max += 10;
    points += 10;
  } else if (
    answers.company &&
    answers.company !==
      "Tanto faz" &&
    COMPANY[answers.company]
  ) {
    max += 10;

    if (
      shares(
        movieGenres,
        COMPANY[answers.company],
      )
    ) {
      points += 10;
    }
  }

  if (
    FEATURES[answers.feature]
  ) {
    max += 20;

    if (
      shares(
        movieGenres,
        FEATURES[answers.feature],
      )
    ) {
      points += 20;
    }
  }

  if (
    answers.favoriteGenreIds.length
  ) {
    max += 20;

    if (
      shares(
        movieGenres,
        answers.favoriteGenreIds,
      )
    ) {
      points += 20;
    }
  }

  if (!max) {
    return Math.min(
      100,
      Math.max(
        0,
        Math.round(
          Number(
            movie.vote_average ?? 0,
          ) * 10,
        ),
      ),
    );
  }

  return Math.min(
    100,
    Math.max(
      0,
      Math.round(
        (points / max) * 100,
      ),
    ),
  );
}

export default async (req) => {
  if (
    req.method === "OPTIONS"
  ) {
    return new Response(
      null,
      {
        status: 204,
        headers: CORS,
      },
    );
  }

  const token =
    process.env.TMDB_READ_TOKEN;

  if (!token) {
    return json(
      {
        error:
          "TMDB_READ_TOKEN não foi encontrado no Netlify.",
      },
      500,
    );
  }

  const requestUrl =
    new URL(req.url);

  const type =
    requestUrl.searchParams.get(
      "type",
    ) ?? "popular";

  async function tmdb(
    path,
    params = {},
  ) {
    const url =
      new URL(
        `https://api.themoviedb.org/3${path}`,
      );

    for (
      const [key, value]
      of Object.entries(params)
    ) {
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

    const response =
      await fetch(
        url,
        {
          headers: {
            Authorization:
              `Bearer ${token}`,

            Accept:
              "application/json",
          },
        },
      );

    if (!response.ok) {
      throw new Error(
        `TMDB respondeu ${response.status}: ${await response.text()}`,
      );
    }

    return response.json();
  }

  try {
    // =========================================================
    // POPULARES
    // =========================================================

    if (type === "popular") {
      const page =
        requestUrl.searchParams.get(
          "page",
        ) ?? "1";

      const data =
        await tmdb(
          "/movie/popular",
          {
            language:
              "pt-BR",

            page,
          },
        );

      return json({
        success:
          true,

        type:
          "popular",

        page:
          data.page,

        totalPages:
          data.total_pages,

        totalResults:
          data.total_results,

        movies:
          data.results,
      });
    }
// ========================================================
// FILMES EM CARTAZ NOS CINEMAS DO BRASIL
// ========================================================

if (type === "now_playing") {
  const page =
    requestUrl.searchParams.get("page") ?? "1";

  const data = await tmdb(
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
            movie.adult !== true &&
            movie.id,
        )
      : [];

  return json({
    success: true,
    type: "now_playing",
    page: data.page ?? 1,
    totalPages: data.total_pages ?? 0,
    totalResults: data.total_results ?? 0,
    movies,
  });
}
    // =========================================================
    // DETALHES
    // =========================================================

    if (type === "details") {
      const id =
        requestUrl.searchParams.get(
          "id",
        );

      if (
        !id ||
        !/^\d+$/.test(id)
      ) {
        return json(
          {
            error:
              "ID de filme inválido.",
          },
          400,
        );
      }

      const [
        details,
        releaseDates,
        watch,
        videosPt,
        videosEn,
      ] =
        await Promise.all([
          tmdb(
            `/movie/${id}`,
            {
              language:
                "pt-BR",
            },
          ),

          tmdb(
            `/movie/${id}/release_dates`,
          ),

          tmdb(
            `/movie/${id}/watch/providers`,
          ),

          tmdb(
            `/movie/${id}/videos`,
            {
              language:
                "pt-BR",
            },
          ),

          tmdb(
            `/movie/${id}/videos`,
            {
              language:
                "en-US",
            },
          ),
        ]);

      const br =
        watch?.results?.BR ?? {};

      const trailer =
        trailerUrl(videosPt) ||
        trailerUrl(videosEn);

      return json({
        success:
          true,

        type:
          "details",

        movie: {
          id:
            details.id,

          title:
            details.title ?? "",

          originalTitle:
            details.original_title ??
            "",

          overview:
            details.overview ?? "",

          releaseDate:
            details.release_date ?? "",

          year:
            details.release_date?.length >=
            4
              ? Number(
                  details.release_date.slice(
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

          genres:
            Array.isArray(
              details.genres,
            )
              ? details.genres.map(
                  (item) =>
                    item.name,
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

          certification:
            formatCertification(
              releaseDates,
            ),

          trailer,

          watch: {
            tmdbLink:
              br.link ?? "",

            streaming:
              providers(
                br.flatrate,
              ),

            free:
              providers(
                br.free,
              ),

            ads:
              providers(
                br.ads,
              ),

            rent:
              providers(
                br.rent,
              ),

            buy:
              providers(
                br.buy,
              ),
          },
        },
      });
    }
// =========================================================
// BUSCA DE FILMES
// =========================================================

if (type === "search") {
  const query =
    requestUrl.searchParams.get("query")?.trim() ?? "";

  const page =
    requestUrl.searchParams.get("page") ?? "1";

  if (query.length < 2) {
    return json({
      success: true,
      type: "search",
      page: 1,
      totalPages: 0,
      totalResults: 0,
      movies: [],
    });
  }

  const data = await tmdb(
    "/search/movie",
    {
      query,
      language: "pt-BR",
      include_adult: false,
      page,
    },
  );

  const movies =
    Array.isArray(data.results)
      ? data.results.filter(
          (movie) =>
            movie.adult !== true &&
            movie.id,
        )
      : [];

  return json({
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
    // =========================================================
    // MOVIE MATCH
    // =========================================================

    if (type === "match") {
      const answers = {
        genre:
          requestUrl.searchParams.get(
            "genre",
          ) ?? "",

        mood:
          requestUrl.searchParams.get(
            "mood",
          ) ?? "",

        era:
          requestUrl.searchParams.get(
            "era",
          ) ?? "",

        duration:
          requestUrl.searchParams.get(
            "duration",
          ) ?? "",

        company:
          requestUrl.searchParams.get(
            "company",
          ) ?? "",

        feature:
          requestUrl.searchParams.get(
            "feature",
          ) ?? "",

        favorite:
          requestUrl.searchParams.get(
            "favorite",
          ) ?? "",
      };

      const selectedStreamings =
        (
          requestUrl.searchParams.get(
            "streamings",
          ) ?? ""
        )
          .split("|")
          .map(
            (item) =>
              item.trim(),
          )
          .filter(
            (item) =>
              item &&
              normalize(item) !==
                "outro",
          );

      answers.favoriteGenreIds =
        [];

      // =======================================================
      // FILME FAVORITO
      // =======================================================

      if (
        answers.favorite.trim()
      ) {
        try {
          const search =
            await tmdb(
              "/search/movie",
              {
                language:
                  "pt-BR",

                query:
                  answers.favorite.trim(),

                include_adult:
                  false,

                page:
                  1,
              },
            );

          const favoriteMovie =
            Array.isArray(
              search.results,
            )
              ? search.results.find(
                  (movie) =>
                    movie.adult !==
                      true &&
                    Array.isArray(
                      movie.genre_ids,
                    ),
                )
              : null;

          answers.favoriteGenreIds =
            ids(favoriteMovie);
        } catch (_) {
          answers.favoriteGenreIds =
            [];
        }
      }

      // =======================================================
      // STREAMINGS
      // =======================================================

      let providerIds = [];

      if (
        selectedStreamings.length
      ) {
        try {
          const data =
            await tmdb(
              "/watch/providers/movie",
              {
                language:
                  "pt-BR",

                watch_region:
                  "BR",
              },
            );

          const list =
            Array.isArray(
              data.results,
            )
              ? data.results
              : [];

          providerIds =
            unique(
              list
                .filter(
                  (provider) =>
                    selectedStreamings.some(
                      (selected) =>
                        providerMatches(
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
          providerIds = [];
        }
      }

      const currentYear =
        new Date().getFullYear();

      const today =
        new Date()
          .toISOString()
          .slice(
            0,
            10,
          );

      const params = {
        language:
          "pt-BR",

        include_adult:
          false,

        include_video:
          false,

        sort_by:
          "popularity.desc",

        "vote_count.gte":
          30,
      };

      // =======================================================
      // GÊNERO
      // =======================================================

      if (
        GENRES[answers.genre]
      ) {
        params.with_genres =
          GENRES[answers.genre];
      }

      // =======================================================
      // ÉPOCA
      // =======================================================

      if (
        answers.era ===
        "Lançamentos"
      ) {
        params[
          "primary_release_date.gte"
        ] =
          `${currentYear - 3}-01-01`;

        params[
          "primary_release_date.lte"
        ] =
          today;
      } else if (
        answers.era ===
        "Recentes"
      ) {
        params[
          "primary_release_date.gte"
        ] =
          `${currentYear - 15}-01-01`;

        params[
          "primary_release_date.lte"
        ] =
          today;
      } else if (
        answers.era ===
        "Clássicos"
      ) {
        params[
          "primary_release_date.lte"
        ] =
          `${currentYear - 16}-12-31`;
      }

      // =======================================================
      // DURAÇÃO
      // =======================================================

      answers.durationFilterApplied =
        answers.duration !== "" &&
        answers.duration !==
          "Tanto faz";

      if (
        answers.duration === "Curto"
      ) {
        params[
          "with_runtime.lte"
        ] =
          100;
      } else if (
        answers.duration === "Médio"
      ) {
        params[
          "with_runtime.gte"
        ] =
          101;

        params[
          "with_runtime.lte"
        ] =
          150;
      } else if (
        answers.duration === "Longo"
      ) {
        params[
          "with_runtime.gte"
        ] =
          151;
      }

      // =======================================================
      // STREAMING
      // =======================================================

      answers.streamingFilterApplied =
        providerIds.length > 0;

      if (
        answers.streamingFilterApplied
      ) {
        params.watch_region =
          "BR";

        params.with_watch_providers =
          providerIds.join("|");

        params.with_watch_monetization_types =
          "flatrate|free|ads";
      }

      // =======================================================
      // BUSCA CANDIDATOS
      // =======================================================

      async function getCandidates(
        pageCount = 3,
      ) {
        const all = [];

        for (
          let page = 1;
          page <= pageCount;
          page++
        ) {
          const data =
            await tmdb(
              "/discover/movie",
              {
                ...params,
                page,
              },
            );

          const results =
            Array.isArray(
              data.results,
            )
              ? data.results
              : [];

          all.push(
            ...results,
          );

          if (
            page >=
            Number(
              data.total_pages ?? 1,
            )
          ) {
            break;
          }
        }

        const map =
          new Map();

        for (
          const movie of all
        ) {
          if (
            movie?.id &&
            movie.adult !== true &&
            !map.has(
              movie.id,
            )
          ) {
            map.set(
              movie.id,
              movie,
            );
          }
        }

        return [
          ...map.values(),
        ];
      }

      let candidates =
        await getCandidates();

      // =======================================================
      // FALLBACK STREAMING
      // =======================================================

      if (
        !candidates.length &&
        answers.streamingFilterApplied
      ) {
        delete params.watch_region;

        delete params.with_watch_providers;

        delete params.with_watch_monetization_types;

        answers.streamingFilterApplied =
          false;

        candidates =
          await getCandidates();
      }

      // =======================================================
      // FALLBACK DURAÇÃO
      // =======================================================

      if (
        !candidates.length &&
        answers.durationFilterApplied
      ) {
        delete params[
          "with_runtime.gte"
        ];

        delete params[
          "with_runtime.lte"
        ];

        answers.durationFilterApplied =
          false;

        candidates =
          await getCandidates();
      }

      // =======================================================
      // CALCULA COMPATIBILIDADE
      // =======================================================

      const ranked =
        candidates
          .map(
            (movie) => ({
              movie,

              compatibility:
                scoreMovie(
                  movie,
                  answers,
                ),
            }),
          )
          .sort(
            (a, b) => {
              if (
                b.compatibility !==
                a.compatibility
              ) {
                return (
                  b.compatibility -
                  a.compatibility
                );
              }

              return (
                Number(
                  b.movie
                    .vote_average ??
                    0,
                ) -
                Number(
                  a.movie
                    .vote_average ??
                    0,
                )
              );
            },
          )
          .slice(
            0,
            12,
          );

      // =======================================================
      // PEGA STREAMINGS DOS RESULTADOS
      // =======================================================

      const movies =
        await Promise.all(
          ranked.map(
            async ({
              movie,
              compatibility,
            }) => {
              let streamings = [];

              try {
                const data =
                  await tmdb(
                    `/movie/${movie.id}/watch/providers`,
                  );

                const br =
                  data?.results?.BR ??
                  {};

                streamings =
                  unique([
                    ...(
                      Array.isArray(
                        br.flatrate,
                      )
                        ? br.flatrate.map(
                            (item) =>
                              item.provider_name,
                          )
                        : []
                    ),

                    ...(
                      Array.isArray(
                        br.free,
                      )
                        ? br.free.map(
                            (item) =>
                              item.provider_name,
                          )
                        : []
                    ),

                    ...(
                      Array.isArray(
                        br.ads,
                      )
                        ? br.ads.map(
                            (item) =>
                              item.provider_name,
                          )
                        : []
                    ),
                  ]);
              } catch (_) {
                streamings =
                  [];
              }

              return {
                ...movie,

                compatibility,

                streamings,
              };
            },
          ),
        );

      return json({
        success:
          true,

        type:
          "match",

        candidateCount:
          candidates.length,

        movies,
      });
    }

    return json(
      {
        error:
          "Tipo de consulta inválido.",
      },
      400,
    );
  } catch (error) {
    return json(
      {
        error:
          "Erro ao consultar a TMDB.",

        details:
          error instanceof Error
            ? error.message
            : String(error),
      },
      500,
    );
  }
};
