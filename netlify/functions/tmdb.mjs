export default async (request, context) => {
  // =========================================================
  // TOKEN DA TMDB
  // =========================================================

  const token = Netlify.env.get("TMDB_READ_TOKEN");

  if (!token) {
    return Response.json(
      {
        error: "TMDB_READ_TOKEN não foi encontrado no Netlify.",
      },
      {
        status: 500,
      },
    );
  }

  try {
    // =======================================================
    // BUSCA FILMES POPULARES
    // =======================================================

    const tmdbResponse = await fetch(
      "https://api.themoviedb.org/3/movie/popular?language=pt-BR&page=1",
      {
        headers: {
          Authorization: `Bearer ${token}`,
          accept: "application/json",
        },
      },
    );

    // =======================================================
    // VERIFICA SE A TMDB RESPONDEU
    // =======================================================

    if (!tmdbResponse.ok) {
      const errorText = await tmdbResponse.text();

      return Response.json(
        {
          error: "Erro ao consultar a TMDB.",
          status: tmdbResponse.status,
          details: errorText,
        },
        {
          status: tmdbResponse.status,
        },
      );
    }

    // =======================================================
    // CONVERTE A RESPOSTA PARA JSON
    // =======================================================

    const data = await tmdbResponse.json();

    // =======================================================
    // DEVOLVE OS FILMES PARA O MOVIEMATCH
    // =======================================================

    return Response.json(
      {
        success: true,
        page: data.page,
        totalPages: data.total_pages,
        totalResults: data.total_results,
        movies: data.results,
      },
      {
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  } catch (error) {
    return Response.json(
      {
        error: "Erro interno ao acessar a TMDB.",
        details: error.message,
      },
      {
        status: 500,
      },
    );
  }
};
