import { NextRequest, NextResponse } from 'next/server';
import { PlaylistCourse, PlaylistItem } from '@/types/playlist';

// Helper to extract playlist ID or video ID from user input
function parseYouTubeInput(input: string): { type: 'playlist' | 'video' | 'unknown'; id: string } {
  const trimmed = input.trim();
  if (!trimmed) return { type: 'unknown', id: '' };

  try {
    if (trimmed.includes('youtube.com') || trimmed.includes('youtu.be')) {
      const url = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
      
      const listParam = url.searchParams.get('list');
      if (listParam) {
        return { type: 'playlist', id: listParam };
      }

      const vParam = url.searchParams.get('v');
      if (vParam) {
        return { type: 'video', id: vParam };
      }

      if (url.hostname === 'youtu.be') {
        const id = url.pathname.replace(/^\//, '').split('?')[0];
        if (id) return { type: 'video', id };
      }
    }
  } catch {
    // If URL parsing fails, continue to regex
  }

  // Check for list= parameter in string
  const listMatch = trimmed.match(/[?&]list=([a-zA-Z0-9_-]+)/);
  if (listMatch && listMatch[1]) {
    return { type: 'playlist', id: listMatch[1] };
  }

  // Direct Playlist ID pattern (usually starts with PL, UU, FL, RD, etc.)
  if (trimmed.startsWith('PL') || trimmed.startsWith('UU') || trimmed.startsWith('FL') || trimmed.startsWith('RD') || trimmed.length >= 24) {
    return { type: 'playlist', id: trimmed };
  }

  // 11 character video ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return { type: 'video', id: trimmed };
  }

  return { type: 'playlist', id: trimmed };
}

function extractDurationFromRenderer(vid: any): string {
  if (!vid) return '';

  // 1. Direct lengthText simpleText or runs
  if (vid.lengthText?.simpleText) return vid.lengthText.simpleText;
  if (vid.lengthText?.runs?.[0]?.text) return vid.lengthText.runs[0].text;

  // 2. Direct lengthSeconds
  if (vid.lengthSeconds) {
    const sec = parseInt(vid.lengthSeconds, 10);
    if (!isNaN(sec) && sec > 0) return formatSecondsToTimeString(sec);
  }

  // 3. thumbnailOverlays array
  if (Array.isArray(vid.thumbnailOverlays)) {
    for (const overlay of vid.thumbnailOverlays) {
      const timeRenderer = overlay?.thumbnailOverlayTimeStatusRenderer;
      if (timeRenderer) {
        if (timeRenderer.text?.simpleText) return timeRenderer.text.simpleText;
        if (timeRenderer.text?.runs?.[0]?.text) return timeRenderer.text.runs[0].text;
      }
    }
  }

  return '';
}

function formatSecondsToTimeString(totalSecs: number): string {
  const hrs = Math.floor(totalSecs / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = Math.floor(totalSecs % 60);
  if (hrs > 0) {
    return `${hrs}:${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

// Fetch video duration directly from YouTube embed page HTML as zero-config fallback
async function fetchSingleEmbedDuration(videoId: string): Promise<string> {
  try {
    const res = await fetch(`https://www.youtube.com/embed/${videoId}`, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      next: { revalidate: 86400 },
    });
    if (!res.ok) return '';
    const html = await res.text();
    const lengthMatch =
      html.match(/"lengthSeconds":"(\d+)"/) || html.match(/"approxDurationMs":"(\d+)"/);
    if (lengthMatch && lengthMatch[1]) {
      const num = parseInt(lengthMatch[1], 10);
      if (!isNaN(num) && num > 0) {
        const secs = lengthMatch[0].includes('approxDurationMs') ? Math.round(num / 1000) : num;
        return formatSecondsToTimeString(secs);
      }
    }
  } catch {
    // safe catch
  }
  return '';
}

// Fetch video durations in bulk (via YouTube Data API if available, or parallel embed scraper)
async function fetchDurationsForVideos(
  videoIds: string[],
  apiKey?: string
): Promise<Record<string, string>> {
  const durationMap: Record<string, string> = {};
  if (!videoIds || videoIds.length === 0) return durationMap;

  const uniqueIds = Array.from(new Set(videoIds));

  // 1. Try YouTube Data API v3 if API key available
  if (apiKey) {
    try {
      for (let i = 0; i < uniqueIds.length; i += 50) {
        const batch = uniqueIds.slice(i, i + 50);
        const res = await fetch(
          `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${batch.join(',')}&key=${apiKey}`
        );
        if (res.ok) {
          const data = await res.json();
          for (const item of data.items || []) {
            if (item?.id && item?.contentDetails?.duration) {
              durationMap[item.id] = item.contentDetails.duration;
            }
          }
        }
      }
    } catch (err) {
      console.warn('Failed to batch fetch video durations via YouTube API:', err);
    }
  }

  // 2. For remaining video IDs without duration, fetch embed HTML
  const missing = uniqueIds.filter((id) => !durationMap[id]);
  if (missing.length > 0) {
    // Limit parallel fetches to chunks of 10 for performance
    for (let i = 0; i < missing.length; i += 10) {
      const chunk = missing.slice(i, i + 10);
      const results = await Promise.all(
        chunk.map(async (vid) => {
          const dur = await fetchSingleEmbedDuration(vid);
          return { vid, dur };
        })
      );
      for (const { vid, dur } of results) {
        if (dur) durationMap[vid] = dur;
      }
    }
  }

  return durationMap;
}

// Scrape public YouTube playlist web page as primary / fallback mechanism
async function scrapeYouTubePlaylist(playlistId: string): Promise<PlaylistCourse | null> {
  try {
    const url = `https://www.youtube.com/playlist?list=${playlistId}&hl=en`;
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      next: { revalidate: 1800 },
    });

    if (!response.ok) return null;

    const html = await response.text();

    // Extract ytInitialData from HTML
    const jsonMatch =
      html.match(/var ytInitialData = ({[\s\S]*?});<\/script>/) ||
      html.match(/ytInitialData\s*=\s*({[\s\S]+?});/);

    if (!jsonMatch || !jsonMatch[1]) return null;

    const data = JSON.parse(jsonMatch[1]);

    // Extract Playlist Title
    const title =
      data.metadata?.playlistMetadataRenderer?.title ||
      data.header?.playlistHeaderRenderer?.title?.simpleText ||
      data.header?.playlistHeaderRenderer?.title?.runs?.[0]?.text ||
      data.header?.pageHeaderRenderer?.pageTitle ||
      'YouTube Playlist Track';

    // Extract Channel Title
    const channelTitle =
      data.header?.playlistHeaderRenderer?.ownerText?.runs?.[0]?.text ||
      data.sidebar?.playlistSidebarRenderer?.items?.[1]?.playlistSidebarSecondaryInfoRenderer?.videoOwner?.videoOwnerRenderer?.title?.runs?.[0]?.text ||
      data.metadata?.playlistMetadataRenderer?.companyName ||
      'YouTube Creator';

    const description =
      data.metadata?.playlistMetadataRenderer?.description ||
      data.header?.playlistHeaderRenderer?.descriptionText?.simpleText ||
      data.header?.playlistHeaderRenderer?.descriptionText?.runs?.[0]?.text ||
      '';

    // Extract Video items
    const rawContents =
      data.contents?.twoColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents?.[0]?.playlistVideoListRenderer?.contents ||
      [];

    const items: PlaylistItem[] = [];

    for (let i = 0; i < rawContents.length; i++) {
      const vid = rawContents[i]?.playlistVideoRenderer;
      if (!vid || !vid.videoId) continue;

      const videoId = vid.videoId;
      const vTitle =
        vid.title?.runs?.[0]?.text ||
        vid.title?.simpleText ||
        `Lesson ${items.length + 1}`;

      if (vTitle === '[Private video]' || vTitle === '[Deleted video]') continue;

      const duration = extractDurationFromRenderer(vid);
      const vChannel =
        vid.shortBylineText?.runs?.[0]?.text ||
        channelTitle;

      const thumbs = vid.thumbnail?.thumbnails || [];
      const bestThumb = thumbs[thumbs.length - 1]?.url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

      items.push({
        id: `item_${videoId}_${i}`,
        videoId,
        title: vTitle,
        description: '',
        thumbnail: bestThumb,
        position: items.length + 1,
        duration: duration || undefined,
        channelTitle: vChannel,
      });
    }

    if (items.length === 0) return null;

    // Fill in any remaining missing durations via embed fallback
    const missingDurationItems = items.filter((it) => !it.duration);
    if (missingDurationItems.length > 0) {
      const missingIds = missingDurationItems.map((it) => it.videoId);
      const fetchedDurations = await fetchDurationsForVideos(missingIds);
      items.forEach((it) => {
        if (!it.duration && fetchedDurations[it.videoId]) {
          it.duration = fetchedDurations[it.videoId];
        }
      });
    }

    const courseThumb =
      items[0]?.thumbnail || `https://i.ytimg.com/vi/${items[0]?.videoId}/hqdefault.jpg`;

    return {
      id: playlistId,
      title,
      channelTitle,
      description,
      thumbnail: courseThumb,
      totalVideos: items.length,
      items,
      isCustom: true,
    };
  } catch (err) {
    console.error('Failed to scrape public YouTube playlist:', err);
    return null;
  }
}

// Scrape or fetch single video metadata via oEmbed
async function fetchSingleYouTubeVideo(videoId: string, apiKey?: string): Promise<PlaylistCourse | null> {
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const res = await fetch(oembedUrl);

    let title = `YouTube Lecture (${videoId})`;
    let channelTitle = 'YouTube Creator';

    if (res.ok) {
      const data = await res.json();
      title = data.title || title;
      channelTitle = data.author_name || channelTitle;
    }

    const durationsMap = await fetchDurationsForVideos([videoId], apiKey);

    const item: PlaylistItem = {
      id: `item_${videoId}_1`,
      videoId,
      title,
      description: '',
      thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      position: 1,
      duration: durationsMap[videoId] || undefined,
      channelTitle,
    };

    return {
      id: `single_${videoId}`,
      title,
      channelTitle,
      description: `Individual video lesson track from ${channelTitle}.`,
      thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      totalVideos: 1,
      items: [item],
      isCustom: true,
    };
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const apiKey = process.env.YOUTUBE_API_KEY;

  // Handle bulk duration fetch request e.g. /api/playlist?ids=id1,id2,id3
  const idsParam = searchParams.get('ids');
  if (idsParam) {
    const videoIds = idsParam
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 100);

    const durations = await fetchDurationsForVideos(videoIds, apiKey);
    return NextResponse.json({ durations });
  }

  const rawInput = searchParams.get('id') || searchParams.get('url') || '';

  if (!rawInput.trim()) {
    return NextResponse.json({ error: 'Please provide a YouTube playlist URL or ID.' }, { status: 400 });
  }

  const parsed = parseYouTubeInput(rawInput);

  if (parsed.type === 'video') {
    const singleCourse = await fetchSingleYouTubeVideo(parsed.id, apiKey);
    if (singleCourse) {
      return NextResponse.json({ course: singleCourse, source: 'single_video' });
    }
  }

  const playlistId = parsed.id;

  // 1. If YouTube API Key is configured, attempt Data API v3 fetch
  if (apiKey) {
    try {
      const metaRes = await fetch(
        `https://www.googleapis.com/youtube/v3/playlists?part=snippet,contentDetails&id=${playlistId}&key=${apiKey}`
      );

      if (metaRes.ok) {
        const metaData = await metaRes.json();
        const playlistInfo = metaData.items?.[0];

        if (playlistInfo) {
          let allItems: PlaylistItem[] = [];
          let pageToken: string | undefined = undefined;
          let pageCount = 0;

          do {
            const pageParam: string = typeof pageToken === 'string' && pageToken ? `&pageToken=${pageToken}` : '';
            const itemsRes = await fetch(
              `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&maxResults=50&playlistId=${playlistId}&key=${apiKey}${pageParam}`
            );

            if (!itemsRes.ok) break;

            const itemsData = await itemsRes.json();
            const rawItems = itemsData.items || [];

            const mappedItems: PlaylistItem[] = rawItems
              .filter((item: Record<string, any>) => {
                const title = item.snippet?.title;
                const videoId = item.snippet?.resourceId?.videoId;
                return videoId && title !== 'Private video' && title !== 'Deleted video';
              })
              .map((item: Record<string, any>, index: number) => {
                const videoId = item.snippet?.resourceId?.videoId as string;
                const thumbnails = item.snippet?.thumbnails;
                const thumbUrl =
                  thumbnails?.maxres?.url ||
                  thumbnails?.high?.url ||
                  thumbnails?.medium?.url ||
                  thumbnails?.default?.url ||
                  `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

                return {
                  id: item.id || `item_${videoId}_${index}`,
                  videoId,
                  title: item.snippet?.title || `Lesson ${allItems.length + index + 1}`,
                  description: item.snippet?.description || '',
                  thumbnail: thumbUrl,
                  position: item.snippet?.position !== undefined ? item.snippet.position + 1 : allItems.length + index + 1,
                  channelTitle: item.snippet?.videoOwnerChannelTitle || item.snippet?.channelTitle || '',
                  publishedAt: item.snippet?.publishedAt || '',
                };
              });

            allItems = [...allItems, ...mappedItems];
            pageToken = itemsData.nextPageToken;
            pageCount++;
          } while (pageToken && pageCount < 3);

          if (allItems.length > 0) {
            // Fetch exact video durations for all YouTube API items
            const allVideoIds = allItems.map((i) => i.videoId);
            const fetchedDurations = await fetchDurationsForVideos(allVideoIds, apiKey);
            allItems.forEach((it) => {
              if (fetchedDurations[it.videoId]) {
                it.duration = fetchedDurations[it.videoId];
              }
            });

            const course: PlaylistCourse = {
              id: playlistId,
              title: playlistInfo.snippet?.title || 'YouTube Playlist Course',
              channelTitle: playlistInfo.snippet?.channelTitle || 'YouTube Creator',
              description: playlistInfo.snippet?.description || '',
              thumbnail:
                playlistInfo.snippet?.thumbnails?.high?.url ||
                allItems[0]?.thumbnail ||
                `https://i.ytimg.com/vi/${allItems[0]?.videoId}/hqdefault.jpg`,
              totalVideos: playlistInfo.contentDetails?.itemCount || allItems.length,
              items: allItems,
              isCustom: true,
            };

            return NextResponse.json({ course, source: 'youtube_api' });
          }
        }
      }
    } catch (apiErr) {
      console.warn('YouTube Data API failed, falling back to public parser:', apiErr);
    }
  }

  // 2. Fetch directly from YouTube web playlist parser
  const scrapedCourse = await scrapeYouTubePlaylist(playlistId);
  if (scrapedCourse && scrapedCourse.items.length > 0) {
    return NextResponse.json({ course: scrapedCourse, source: 'youtube_web_parser' });
  }

  return NextResponse.json(
    {
      error:
        'Could not load playlist. Please ensure the playlist is public or unlisted (not private), and that the link is formatted correctly.',
    },
    { status: 404 }
  );
}
