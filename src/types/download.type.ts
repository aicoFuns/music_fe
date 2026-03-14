// 下载中 Downloading
// 暂停 Pause
// 完成，没有失败的 Done
// 有失败的 Failed
import type { Song } from './song.type';

export type DownloadQueueTaskStatus =
  | 'Done'
  | 'Downloading'
  | 'Pause'
  | 'Failed';

export type CurrentDownloadStatus =
  | 'Success'
  | 'Failed'
  | 'Downloading'
  | 'WaitStart';

export type FileSuffixType =
  | 'default.mp3'
  | 'high.mp3'
  | 'no-loss.flac'
  | 'surround.flac'
  | 'cover.jpg';

export type DownloadSong = Song & {
  downloadStatus: CurrentDownloadStatus;
  fileSuffixType?: FileSuffixType;
};
