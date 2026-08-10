import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../models/content.dart';
import '../services/favorites_service.dart';
import '../services/tmdb_service.dart';

class DetailsPage extends StatefulWidget {
  final Content content;

  const DetailsPage({
    super.key,
    required this.content,
  });

  @override
  State<DetailsPage> createState() => _DetailsPageState();
}

class _DetailsPageState extends State<DetailsPage> {
  late Content movie;

  bool loadingDetails = false;
  String? detailsError;

  Map<String, dynamic>? watchData;

  // ===========================================================
  // LINKS OFICIAIS DOS STREAMINGS
  // Usados principalmente pelos 4 filmes cadastrados manualmente.
  // ===========================================================

  final Map<String, String> streamingLinks = {
    'Netflix': 'https://www.netflix.com/br/',
    'Prime Video': 'https://www.primevideo.com/',
    'Disney+': 'https://www.disneyplus.com/pt-br',
    'HBO Max': 'https://www.hbomax.com/br/pt',
    'Max': 'https://www.hbomax.com/br/pt',
    'Globoplay': 'https://globoplay.globo.com/',
    'Apple TV+': 'https://tv.apple.com/br',
    'Apple TV': 'https://tv.apple.com/br',
    'Paramount+': 'https://www.paramountplus.com/br/',
    'Crunchyroll': 'https://www.crunchyroll.com/pt-br/',
    'Universal+': 'https://universalplus.com.br/',
    'Claro tv+': 'https://www.clarotvmais.com.br/',
  };

  @override
  void initState() {
    super.initState();

    movie = widget.content;

    // Filmes vindos da TMDB possuem ID.
    // Nesse caso buscamos duração, classificação, trailer e onde assistir.
    if (widget.content.tmdbId != null) {
      _loadTmdbDetails();
    }
  }

  // ===========================================================
  // CARREGA DETALHES COMPLETOS DA TMDB
  // ===========================================================

  Future<void> _loadTmdbDetails() async {
    final id = widget.content.tmdbId;

    if (id == null) {
      return;
    }

    setState(() {
      loadingDetails = true;
      detailsError = null;
    });

    try {
      final details = await TmdbService.getMovieDetails(id);

      final rawGenres = details['genres'];

      final genres = <String>[];

      if (rawGenres is List) {
        for (final genre in rawGenres) {
          final text = genre?.toString().trim() ?? '';

          if (text.isNotEmpty) {
            genres.add(text);
          }
        }
      }

      final rawWatch = details['watch'];

      final Map<String, dynamic> parsedWatch = rawWatch is Map
          ? Map<String, dynamic>.from(rawWatch)
          : <String, dynamic>{};

      final providerNames = _providerNames(parsedWatch['streaming']);

      final title = _textOrFallback(
        details['title'],
        widget.content.name,
      );

      final overview = _textOrFallback(
        details['overview'],
        widget.content.description,
      );

      final poster = _textOrFallback(
        details['poster'],
        widget.content.image,
      );

      final trailer = _textOrFallback(
        details['trailer'],
        widget.content.trailer,
      );

      final certification = _textOrFallback(
        details['certification'],
        widget.content.ageRating,
      );

      final year = _intOrFallback(
        details['year'],
        widget.content.year,
      );

      final rating = _doubleOrFallback(
        details['rating'],
        widget.content.rating,
      );

      final runtime = TmdbService.formatRuntime(
        details['runtime'],
      );

      final genreText = genres.isNotEmpty
          ? genres.join(' • ')
          : widget.content.genre;

      final updatedMovie = Content(
        tmdbId: id,
        name: title,
        genre: genreText,
        year: year,
        rating: rating,
        duration: runtime,
        ageRating: certification,
        description: overview,
        image: poster,
        trailer: trailer,
        moods: widget.content.moods,
        streamings: providerNames,
        features: widget.content.features,
      );

      if (!mounted) {
        return;
      }

      setState(() {
        movie = updatedMovie;
        watchData = parsedWatch;
        loadingDetails = false;
        detailsError = null;
      });
    } catch (error) {
      if (!mounted) {
        return;
      }

      setState(() {
        loadingDetails = false;
        detailsError = error.toString();
      });
    }
  }

  // ===========================================================
  // CONVERSÕES
  // ===========================================================

  String _textOrFallback(dynamic value, String fallback) {
    final text = value?.toString().trim() ?? '';

    if (text.isEmpty) {
      return fallback;
    }

    return text;
  }

  int _intOrFallback(dynamic value, int fallback) {
    if (value is int) {
      return value;
    }

    return int.tryParse(value?.toString() ?? '') ?? fallback;
  }

  double _doubleOrFallback(dynamic value, double fallback) {
    if (value is num) {
      return value.toDouble();
    }

    return double.tryParse(value?.toString() ?? '') ?? fallback;
  }

  List<String> _providerNames(dynamic rawList) {
    final names = <String>[];

    if (rawList is! List) {
      return names;
    }

    for (final item in rawList) {
      if (item is Map) {
        final name = item['name']?.toString().trim() ?? '';

        if (name.isNotEmpty && !names.contains(name)) {
          names.add(name);
        }
      }
    }

    return names;
  }

  List<Map<String, dynamic>> _providerList(String key) {
    final rawList = watchData?[key];

    if (rawList is! List) {
      return [];
    }

    final providers = <Map<String, dynamic>>[];

    for (final item in rawList) {
      if (item is Map) {
        providers.add(
          Map<String, dynamic>.from(item),
        );
      }
    }

    return providers;
  }

  // ===========================================================
  // FAVORITO
  // ===========================================================

  bool get isFavorite {
    return FavoritesService.favorites.contains(widget.content);
  }

  void _toggleFavorite() {
    setState(() {
      if (isFavorite) {
        FavoritesService.favorites.remove(widget.content);
      } else {
        FavoritesService.favorites.add(widget.content);
      }
    });
  }

  // ===========================================================
  // ABRIR LINK
  // ===========================================================

  Future<void> _openLink(String url) async {
    if (url.trim().isEmpty) {
      _showLinkError();
      return;
    }

    final uri = Uri.tryParse(url);

    if (uri == null) {
      _showLinkError();
      return;
    }

    try {
      final opened = await launchUrl(
        uri,
        mode: LaunchMode.platformDefault,
        webOnlyWindowName: '_blank',
      );

      if (!opened && mounted) {
        _showLinkError();
      }
    } catch (_) {
      if (mounted) {
        _showLinkError();
      }
    }
  }

  void _showLinkError() {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Não foi possível abrir esse link.'),
      ),
    );
  }

  // ===========================================================
  // TRAILER
  // ===========================================================

  Future<void> _openTrailer() async {
    if (movie.trailer.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Trailer não encontrado para este filme.'),
        ),
      );

      return;
    }

    await _openLink(movie.trailer);
  }

  // ===========================================================
  // BUILD
  // ===========================================================

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        foregroundColor: Colors.white,
        elevation: 0,
        title: const Text(
          'Detalhes',
          style: TextStyle(
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
      body: Column(
        children: [
          if (loadingDetails)
            const LinearProgressIndicator(
              color: Colors.red,
              backgroundColor: Color(0xFF1C1C1C),
            ),
          if (detailsError != null)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(
                horizontal: 20,
                vertical: 10,
              ),
              color: const Color(0xFF241010),
              child: const Text(
                'Não foi possível carregar todos os dados da TMDB. '
                'As informações básicas continuam disponíveis.',
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: Colors.white70,
                  fontSize: 13,
                ),
              ),
            ),
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(
                25,
                15,
                25,
                50,
              ),
              child: Center(
                child: ConstrainedBox(
                  constraints: const BoxConstraints(
                    maxWidth: 1100,
                  ),
                  child: LayoutBuilder(
                    builder: (context, constraints) {
                      final compact =
                          constraints.maxWidth < 760;

                      if (compact) {
                        return _buildCompact();
                      }

                      return _buildWide();
                    },
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ===========================================================
  // DESKTOP
  // ===========================================================

  Widget _buildWide() {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildPoster(
          width: 300,
          height: 450,
        ),
        const SizedBox(width: 40),
        Expanded(
          child: _buildInformation(),
        ),
      ],
    );
  }

  // ===========================================================
  // TELA MENOR
  // ===========================================================

  Widget _buildCompact() {
    return Column(
      children: [
        _buildPoster(
          width: 260,
          height: 390,
        ),
        const SizedBox(height: 30),
        _buildInformation(),
      ],
    );
  }

  // ===========================================================
  // CARTAZ
  // ===========================================================

  Widget _buildPoster({
    required double width,
    required double height,
  }) {
    return Container(
      width: width,
      height: height,
      decoration: BoxDecoration(
        color: const Color(0xFF171717),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.red.withOpacity(0.18),
            blurRadius: 30,
            spreadRadius: 2,
          ),
        ],
      ),
      clipBehavior: Clip.antiAlias,
      child: _posterImage(),
    );
  }

  Widget _posterImage() {
    final image = movie.image.trim();

    if (image.isEmpty) {
      return _posterPlaceholder();
    }

    final isNetwork =
        image.startsWith('http://') ||
        image.startsWith('https://');

    if (isNetwork) {
      return Image.network(
        image,
        fit: BoxFit.cover,
        filterQuality: FilterQuality.high,
        loadingBuilder: (
          context,
          child,
          loadingProgress,
        ) {
          if (loadingProgress == null) {
            return child;
          }

          return Container(
            color: const Color(0xFF171717),
            alignment: Alignment.center,
            child: const CircularProgressIndicator(
              color: Colors.red,
              strokeWidth: 2,
            ),
          );
        },
        errorBuilder: (
          context,
          error,
          stackTrace,
        ) {
          return _posterPlaceholder();
        },
      );
    }

    return Image.asset(
      'assets/images/$image',
      fit: BoxFit.cover,
      filterQuality: FilterQuality.high,
      errorBuilder: (
        context,
        error,
        stackTrace,
      ) {
        return _posterPlaceholder();
      },
    );
  }

  Widget _posterPlaceholder() {
    return Container(
      color: const Color(0xFF171717),
      alignment: Alignment.center,
      child: const Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.movie_outlined,
            color: Colors.white38,
            size: 64,
          ),
          SizedBox(height: 10),
          Text(
            'Sem pôster',
            style: TextStyle(
              color: Colors.white38,
            ),
          ),
        ],
      ),
    );
  }

  // ===========================================================
  // INFORMAÇÕES
  // ===========================================================

  Widget _buildInformation() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          movie.name,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 38,
            height: 1.1,
            fontWeight: FontWeight.w900,
          ),
        ),
        const SizedBox(height: 18),

        // INFORMAÇÕES RÁPIDAS
        Wrap(
          spacing: 10,
          runSpacing: 10,
          children: [
            _infoChip(
              Icons.star_rounded,
              movie.rating.toStringAsFixed(1),
              iconColor: Colors.amber,
            ),
            if (movie.year > 0)
              _infoChip(
                Icons.calendar_today_outlined,
                movie.year.toString(),
              ),
            if (movie.genre.trim().isNotEmpty)
              _infoChip(
                Icons.movie_outlined,
                movie.genre,
              ),
            _infoChip(
              Icons.schedule_rounded,
              movie.duration,
            ),
            _infoChip(
              Icons.people_outline,
              movie.ageRating,
            ),
          ],
        ),

        const SizedBox(height: 28),

        // BOTÕES
        Wrap(
          spacing: 12,
          runSpacing: 12,
          children: [
            ElevatedButton.icon(
              onPressed:
                  movie.trailer.trim().isEmpty
                      ? null
                      : _openTrailer,
              icon: const Icon(
                Icons.play_arrow_rounded,
              ),
              label: Text(
                loadingDetails
                    ? 'Carregando trailer...'
                    : 'Assistir trailer',
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.red,
                disabledBackgroundColor:
                    Colors.red.withOpacity(0.25),
                foregroundColor: Colors.white,
                disabledForegroundColor: Colors.white54,
                padding: const EdgeInsets.symmetric(
                  horizontal: 22,
                  vertical: 16,
                ),
                shape: RoundedRectangleBorder(
                  borderRadius:
                      BorderRadius.circular(12),
                ),
              ),
            ),
            OutlinedButton.icon(
              onPressed: _toggleFavorite,
              icon: Icon(
                isFavorite
                    ? Icons.favorite
                    : Icons.favorite_border,
                color: isFavorite
                    ? Colors.red
                    : Colors.white,
              ),
              label: Text(
                isFavorite
                    ? 'Favoritado'
                    : 'Favoritar',
              ),
              style: OutlinedButton.styleFrom(
                foregroundColor: Colors.white,
                side: BorderSide(
                  color: isFavorite
                      ? Colors.red
                      : Colors.white24,
                ),
                padding: const EdgeInsets.symmetric(
                  horizontal: 22,
                  vertical: 16,
                ),
                shape: RoundedRectangleBorder(
                  borderRadius:
                      BorderRadius.circular(12),
                ),
              ),
            ),
          ],
        ),

        const SizedBox(height: 36),

        // =====================================================
        // SINOPSE
        // =====================================================

        const Text(
          'Sinopse',
          style: TextStyle(
            color: Colors.white,
            fontSize: 22,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 12),
        Text(
          movie.description.trim().isEmpty
              ? 'Sinopse não disponível.'
              : movie.description,
          style: const TextStyle(
            color: Colors.white70,
            fontSize: 16,
            height: 1.6,
          ),
        ),

        const SizedBox(height: 38),

        // =====================================================
        // ONDE ASSISTIR
        // =====================================================

        _buildStreamingSection(),
      ],
    );
  }

  // ===========================================================
  // ONDE ASSISTIR
  // ===========================================================

  Widget _buildStreamingSection() {
    if (widget.content.tmdbId != null) {
      return _buildTmdbStreamingSection();
    }

    return _buildLocalStreamingSection();
  }

  // ===========================================================
  // ONDE ASSISTIR - TMDB
  // ===========================================================

  Widget _buildTmdbStreamingSection() {
    final streaming = _providerList('streaming');
    final free = _providerList('free');
    final ads = _providerList('ads');
    final rent = _providerList('rent');
    final buy = _providerList('buy');

    final hasProviders =
        streaming.isNotEmpty ||
        free.isNotEmpty ||
        ads.isNotEmpty ||
        rent.isNotEmpty ||
        buy.isNotEmpty;

    final tmdbLink =
        watchData?['tmdbLink']?.toString().trim() ?? '';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Row(
          children: [
            Icon(
              Icons.live_tv_rounded,
              color: Colors.red,
              size: 25,
            ),
            SizedBox(width: 10),
            Text(
              'Onde assistir no Brasil',
              style: TextStyle(
                color: Colors.white,
                fontSize: 22,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        const Text(
          'A disponibilidade pode mudar com o tempo.',
          style: TextStyle(
            color: Colors.white38,
            fontSize: 13,
          ),
        ),
        const SizedBox(height: 18),

        if (loadingDetails)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: const Color(0xFF151515),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(
                color: Colors.white10,
              ),
            ),
            child: const Row(
              children: [
                SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(
                    color: Colors.red,
                    strokeWidth: 2,
                  ),
                ),
                SizedBox(width: 14),
                Text(
                  'Buscando disponibilidade...',
                  style: TextStyle(
                    color: Colors.white70,
                  ),
                ),
              ],
            ),
          )
        else if (!hasProviders)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: const Color(0xFF151515),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(
                color: Colors.white10,
              ),
            ),
            child: const Row(
              children: [
                Icon(
                  Icons.info_outline,
                  color: Colors.white38,
                ),
                SizedBox(width: 12),
                Expanded(
                  child: Text(
                    'Nenhuma opção de exibição foi encontrada para o Brasil.',
                    style: TextStyle(
                      color: Colors.white54,
                    ),
                  ),
                ),
              ],
            ),
          )
        else ...[
          if (streaming.isNotEmpty)
            _buildProviderGroup(
              'Por assinatura',
              Icons.subscriptions_outlined,
              streaming,
              tmdbLink,
            ),
          if (free.isNotEmpty)
            _buildProviderGroup(
              'Grátis',
              Icons.card_giftcard_outlined,
              free,
              tmdbLink,
            ),
          if (ads.isNotEmpty)
            _buildProviderGroup(
              'Grátis com anúncios',
              Icons.ad_units_outlined,
              ads,
              tmdbLink,
            ),
          if (rent.isNotEmpty)
            _buildProviderGroup(
              'Alugar',
              Icons.schedule_send_outlined,
              rent,
              tmdbLink,
            ),
          if (buy.isNotEmpty)
            _buildProviderGroup(
              'Comprar',
              Icons.shopping_bag_outlined,
              buy,
              tmdbLink,
            ),
        ],

        if (tmdbLink.isNotEmpty) ...[
          const SizedBox(height: 8),
          OutlinedButton.icon(
            onPressed: () {
              _openLink(tmdbLink);
            },
            icon: const Icon(
              Icons.open_in_new_rounded,
            ),
            label: const Text(
              'Ver todas as opções',
            ),
            style: OutlinedButton.styleFrom(
              foregroundColor: Colors.white,
              side: const BorderSide(
                color: Colors.white24,
              ),
              padding: const EdgeInsets.symmetric(
                horizontal: 18,
                vertical: 14,
              ),
              shape: RoundedRectangleBorder(
                borderRadius:
                    BorderRadius.circular(12),
              ),
            ),
          ),
        ],

        const SizedBox(height: 14),

        const Text(
          'Dados de disponibilidade: TMDB / JustWatch.',
          style: TextStyle(
            color: Colors.white24,
            fontSize: 11,
          ),
        ),
      ],
    );
  }

  Widget _buildProviderGroup(
    String title,
    IconData icon,
    List<Map<String, dynamic>> providers,
    String tmdbLink,
  ) {
    return Padding(
      padding: const EdgeInsets.only(
        bottom: 22,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                icon,
                color: Colors.white54,
                size: 18,
              ),
              const SizedBox(width: 8),
              Text(
                title,
                style: const TextStyle(
                  color: Colors.white70,
                  fontSize: 15,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 12,
            runSpacing: 12,
            children: providers.map((provider) {
              return _providerCard(
                provider,
                tmdbLink,
              );
            }).toList(),
          ),
        ],
      ),
    );
  }

  String? _providerOfficialUrl(String providerName) {
    final name = providerName.toLowerCase();

    if (name.contains('amazon') || name.contains('prime video')) {
      return 'https://www.primevideo.com/';
    }

    if (name.contains('netflix')) {
      return 'https://www.netflix.com/br/';
    }

    if (name.contains('disney')) {
      return 'https://www.disneyplus.com/pt-br';
    }

    if (name.contains('max') || name.contains('hbo')) {
      return 'https://www.hbomax.com/br/pt';
    }

    if (name.contains('globoplay')) {
      return 'https://globoplay.globo.com/';
    }

    if (name.contains('apple')) {
      return 'https://tv.apple.com/br';
    }

    if (name.contains('paramount')) {
      return 'https://www.paramountplus.com/br/';
    }

    if (name.contains('crunchyroll')) {
      return 'https://www.crunchyroll.com/pt-br/';
    }

    if (name.contains('universal')) {
      return 'https://universalplus.com.br/';
    }

    if (name.contains('claro')) {
      return 'https://www.clarotvmais.com.br/';
    }

    if (name.contains('mercado play')) {
      return 'https://www.mercadolivre.com.br/mercado-play';
    }

    if (name.contains('google play')) {
      return 'https://play.google.com/store/movies';
    }

    return null;
  }

  Widget _providerCard(
    Map<String, dynamic> provider,
    String tmdbLink,
  ) {
    final name =
        provider['name']?.toString().trim() ??
        'Streaming';

    final logo =
        provider['logo']?.toString().trim() ?? '';

    final officialUrl = _providerOfficialUrl(name);
    final canOpen = officialUrl != null;

    return MouseRegion(
      cursor: canOpen
          ? SystemMouseCursors.click
          : SystemMouseCursors.basic,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: canOpen
              ? () {
                  _openLink(officialUrl);
                }
              : null,
          borderRadius: BorderRadius.circular(14),
          child: Container(
            constraints: const BoxConstraints(
              minWidth: 170,
              maxWidth: 270,
            ),
            padding: const EdgeInsets.symmetric(
              horizontal: 12,
              vertical: 11,
            ),
            decoration: BoxDecoration(
              color: const Color(0xFF171717),
              borderRadius:
                  BorderRadius.circular(14),
              border: Border.all(
                color: Colors.white10,
              ),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                _providerLogo(logo),
                const SizedBox(width: 11),
                Flexible(
                  child: Text(
                    name,
                    maxLines: 2,
                    overflow:
                        TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 13,
                      fontWeight:
                          FontWeight.w600,
                    ),
                  ),
                ),
                if (canOpen) ...[
                  const SizedBox(width: 8),
                  const Icon(
                    Icons.open_in_new_rounded,
                    color: Colors.white30,
                    size: 15,
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _providerLogo(String logo) {
    if (logo.isEmpty) {
      return Container(
        width: 42,
        height: 42,
        decoration: BoxDecoration(
          color: Colors.red,
          borderRadius: BorderRadius.circular(10),
        ),
        child: const Icon(
          Icons.play_arrow_rounded,
          color: Colors.white,
        ),
      );
    }

    return ClipRRect(
      borderRadius: BorderRadius.circular(10),
      child: Image.network(
        logo,
        width: 42,
        height: 42,
        fit: BoxFit.cover,
        errorBuilder: (
          context,
          error,
          stackTrace,
        ) {
          return Container(
            width: 42,
            height: 42,
            color: const Color(0xFF252525),
            child: const Icon(
              Icons.live_tv_rounded,
              color: Colors.white38,
            ),
          );
        },
      ),
    );
  }

  // ===========================================================
  // ONDE ASSISTIR - FILMES MANUAIS
  // ===========================================================

  Widget _buildLocalStreamingSection() {
    final streamings = movie.streamings;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Row(
          children: [
            Icon(
              Icons.live_tv_rounded,
              color: Colors.red,
              size: 25,
            ),
            SizedBox(width: 10),
            Text(
              'Onde assistir',
              style: TextStyle(
                color: Colors.white,
                fontSize: 22,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        const Text(
          'Clique em um streaming para abrir o site.',
          style: TextStyle(
            color: Colors.white38,
            fontSize: 13,
          ),
        ),
        const SizedBox(height: 18),
        if (streamings.isEmpty)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: const Color(0xFF151515),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(
                color: Colors.white10,
              ),
            ),
            child: const Row(
              children: [
                Icon(
                  Icons.info_outline,
                  color: Colors.white38,
                ),
                SizedBox(width: 12),
                Expanded(
                  child: Text(
                    'Disponibilidade em streaming ainda não cadastrada.',
                    style: TextStyle(
                      color: Colors.white54,
                    ),
                  ),
                ),
              ],
            ),
          )
        else
          Wrap(
            spacing: 12,
            runSpacing: 12,
            children: streamings.map((streaming) {
              return _streamingButton(
                streaming,
              );
            }).toList(),
          ),
        const SizedBox(height: 12),
        if (streamings.isNotEmpty)
          const Text(
            'A disponibilidade dos filmes pode mudar com o tempo.',
            style: TextStyle(
              color: Colors.white24,
              fontSize: 11,
            ),
          ),
      ],
    );
  }

  // ===========================================================
  // BOTÃO DE STREAMING MANUAL
  // ===========================================================

  Widget _streamingButton(String streaming) {
    final url = streamingLinks[streaming];

    final hasLink = url != null;

    return MouseRegion(
      cursor: hasLink
          ? SystemMouseCursors.click
          : SystemMouseCursors.basic,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: hasLink
              ? () {
                  _openLink(url);
                }
              : null,
          borderRadius:
              BorderRadius.circular(14),
          child: Container(
            padding: const EdgeInsets.symmetric(
              horizontal: 18,
              vertical: 14,
            ),
            decoration: BoxDecoration(
              color: const Color(0xFF171717),
              borderRadius:
                  BorderRadius.circular(14),
              border: Border.all(
                color: hasLink
                    ? Colors.red.withOpacity(0.65)
                    : Colors.white12,
              ),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 34,
                  height: 34,
                  decoration: BoxDecoration(
                    color: Colors.red,
                    borderRadius:
                        BorderRadius.circular(9),
                  ),
                  child: const Icon(
                    Icons.play_arrow_rounded,
                    color: Colors.white,
                    size: 23,
                  ),
                ),
                const SizedBox(width: 11),
                Text(
                  streaming,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 14,
                    fontWeight:
                        FontWeight.bold,
                  ),
                ),
                if (hasLink) ...[
                  const SizedBox(width: 12),
                  const Icon(
                    Icons.open_in_new_rounded,
                    color: Colors.white38,
                    size: 17,
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }

  // ===========================================================
  // CHIP
  // ===========================================================

  Widget _infoChip(
    IconData icon,
    String text, {
    Color iconColor = Colors.white70,
  }) {
    final displayText = text.trim().isEmpty
        ? 'Não informado'
        : text;

    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: 12,
        vertical: 9,
      ),
      decoration: BoxDecoration(
        color: const Color(0xFF171717),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(
          color: Colors.white10,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            icon,
            color: iconColor,
            size: 17,
          ),
          const SizedBox(width: 6),
          Text(
            displayText,
            style: const TextStyle(
              color: Colors.white70,
              fontSize: 13,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}
