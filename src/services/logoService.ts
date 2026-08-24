// Dynamic Title Logo Service with Dual API Fallback Chain (TMDB API -> Fanart.tv Fallback -> Normal Text)

const TMDB_API_KEYS = [
  'e0db4f055006d21467690ab289150735',
  '2f248e3e4a2d8a1f81d137f864e402e8',
  'b3f545f94943714c62c93d9b15886618',
];

const FANART_API_KEYS = [
  'dcdc5579d5b7bf3ade3daae32e84cb46',
  '6f17e33502931a23e1c668b5a0349666',
];

const logoCache = new Map<string, string | null>();
const inFlightRequests = new Map<string, Promise<string | null>>();

export async function fetchMediaLogo(title: string): Promise<string | null> {
  if (!title) return null;
  const key = title.trim().toLowerCase();
  if (logoCache.has(key)) return logoCache.get(key)!;
  if (inFlightRequests.has(key)) return inFlightRequests.get(key)!;

  const promise = (async () => {
    try {
      // Step A: Clean/Sanitize Title for high-accuracy API search
      const cleanTitle = title
        .replace(/\s*\([^)]*\)/g, '')
        .replace(/\s*\[[^\]]*\]/g, '')
        .replace(/:\s*Season\s*\d+/gi, '')
        .replace(/\s*Part\s*\d+/gi, '')
        .replace(/\s*\d+(?:nd|rd|th|st)\s*Season/gi, '')
        .trim();

      let tmdbId: number | null = null;
      let mediaType: 'movie' | 'tv' = 'tv';

      // Step B: Primary Source - TMDB API with Key Rotation
      for (const apiKey of TMDB_API_KEYS) {
        try {
          const res = await fetch(
            `https://api.themoviedb.org/3/search/multi?api_key=${apiKey}&query=${encodeURIComponent(
              cleanTitle
            )}&include_adult=true`
          );
          if (res.ok) {
            const data = await res.json();
            const match =
              (data.results || []).find(
                (r: { media_type?: string; id?: number }) =>
                  r.media_type === 'tv' || r.media_type === 'movie'
              ) || data.results?.[0];

            if (match?.id) {
              tmdbId = match.id;
              mediaType = match.media_type === 'movie' ? 'movie' : 'tv';
              const imgRes = await fetch(
                `https://api.themoviedb.org/3/${mediaType}/${tmdbId}/images?api_key=${apiKey}&include_image_language=en,ja,null`
              );
              if (imgRes.ok) {
                const imgData = await imgRes.json();
                const logos = imgData.logos || [];
                const pref =
                  logos.find((l: { iso_639_1?: string; file_path?: string }) => l.iso_639_1 === 'en') ||
                  logos.find((l: { iso_639_1?: string; file_path?: string }) => l.iso_639_1 === 'ja') ||
                  logos[0];

                if (pref?.file_path) {
                  const url = `https://image.tmdb.org/t/p/original${pref.file_path}`;
                  // Pre-warm browser image cache
                  try {
                    const preloadImg = new Image();
                    preloadImg.src = url;
                  } catch {
                    // Ignore preload error
                  }
                  logoCache.set(key, url);
                  return url;
                }
              }
            }
          }
        } catch {
          // Continue to next key or fallback
        }
      }

      // Step C: Secondary Source (Fallback) - Fanart.tv API
      if (tmdbId) {
        const fanartType = mediaType === 'movie' ? 'movies' : 'tv';
        for (const fanartKey of FANART_API_KEYS) {
          try {
            const fRes = await fetch(
              `https://webservice.fanart.tv/v3/${fanartType}/${tmdbId}?api_key=${fanartKey}`
            );
            if (fRes.ok) {
              const fData = await fRes.json();
              const logoList =
                fData.hdtvlogo ||
                fData.clearlogo ||
                fData.hdclearart ||
                fData.movielogo ||
                [];
              if (logoList.length > 0 && logoList[0].url) {
                const url = logoList[0].url;
                try {
                  const preloadImg = new Image();
                  preloadImg.src = url;
                } catch {
                  // Ignore
                }
                logoCache.set(key, url);
                return url;
              }
            }
          } catch {
            // Continue
          }
        }
      }

      // Step D: Standard Text Fallback
      logoCache.set(key, null);
      return null;
    } catch {
      logoCache.set(key, null);
      return null;
    } finally {
      inFlightRequests.delete(key);
    }
  })();

  inFlightRequests.set(key, promise);
  return promise;
}
