// 下载中 Downloading
// 暂停 Pause
// 完成，没有失败的 Done
// 有失败的 Failed
type DownloadQueueTaskStatus = 'Done' | 'Downloading' | 'Pause' | 'Failed';

type CurrentDownloadStatus = 'Success' | 'Failed' | 'Downloading' | 'WaitStart';

type DownloadSong = Song & {
  downloadStatus: CurrentDownloadStatus;
  fileSuffixType?: FileSuffixType;
};

type FileSuffixType =
  | 'default.mp3'
  | 'high.mp3'
  | 'no-loss.flac'
  | 'surround.flac'
  | 'cover.jpg';
