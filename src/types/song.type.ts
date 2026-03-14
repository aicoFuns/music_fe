//platform songId songTitle singerId singerName albumId isBookMarked
type SongType = 'music' | 'sound';

export type Song = {
  platform: string;
  songId: string;
  songTitle: string;
  songImg: string;
  url: string;
  songLyric?: string;
  urlRefreshTime?: Date;
  singerName: string;
  albumId: string;
  soundAlbumId?: string;
  albumTitle: string;
  isBookmarked: boolean;
  songType?: SongType;
};

export type SkipStartEnd = {
  platform: string;
  soundAlbumId: string;
  skipStart: number;
  skipEnd: number;
};
