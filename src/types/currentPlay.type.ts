//import { State } from 'react-native-track-player';
// type QQLevel = '320';
// type WyyLevel = 'exhigh';

type CurrentPlay = {
  isPlaying?: boolean;
  trackPlayState?: string;
  songItem?: Song | null;
  playIndex?: number;
  playMode?: number;
  playRate?: number;
  qqConfigLevel?: number;
  qqFinalLevel?: number;
  wyyConfigLevel?: number;
  wyyFinalLevel?: number;
  playPosition?: number;
  playDuration?: number;
  planStopAt?: Date;
};
