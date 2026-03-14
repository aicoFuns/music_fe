import { isEmpty } from 'lodash';
import useDownloadListStore from './global/useDownloadListStore';
import MyUtils from './utils/MyUtils';
import apiClient from './utils/ApiClient';
import logUtil from './utils/LogUtil';
import ToastUtil from './utils/ToastUtil';
import usePlaylistStore from './global/usePlaylistStore';
import Mp3Tagger from './Mp3Tagger';

const downloadCore = {
  startDownload: async () => {
    const downloadState = useDownloadListStore.getState();
    const downloadStatus = downloadState.downloadQueueTaskStatus;
    if (downloadStatus === 'Downloading') {
      console.log('已经在下载中，无需触发');
      return;
    }
    _startDownload();
  },
  initDownload: initDownload,
  pauseDownload: pauseDownload,
  downloadLimit: _downloadLimit,
  downloadSuccessCnt: _downloadSuccessCnt,
};

async function _downloadLimit() {
  const result = await apiClient.get('/utils/download/limit');
  return result.data.result;
}

async function _downloadSuccessCnt() {
  const result = await apiClient.get(
    '/utils/user-action/count/day?action=DOWNLOAD-SUCCESS',
  );
  return result.data.result;
}

async function _startDownload() {
  useDownloadListStore.getState().setDownloadQueueTaskStatus('Downloading');
  try {
    while (true) {
      const nextDownloadIndex = useDownloadListStore
        .getState()
        .downLoadList.findIndex(item => item.downloadStatus === 'WaitStart');
      if (nextDownloadIndex === -1) {
        console.log('没有下一个待下载歌曲了，即将结束startDownload');
        const isExistFailedItem = useDownloadListStore
          .getState()
          .downLoadList.some(item => item.downloadStatus === 'Failed');
        console.log(`检测是否存在失败的条目，检测结果：${isExistFailedItem}`);
        useDownloadListStore
          .getState()
          .setDownloadQueueTaskStatus(isExistFailedItem ? 'Failed' : 'Done');
        break;
      } else {
        useDownloadListStore
          .getState()
          .setCurrentDownloadIndex(nextDownloadIndex);
      }
      try {
        // 校验超额
        const downloadLimit = await _downloadLimit();
        const downloadSuccessCnt = await _downloadSuccessCnt();
        if (downloadSuccessCnt >= downloadLimit) {
          console.log(
            `已经达到今日限额，当前limit:${downloadLimit} 总下载成功数量:${downloadSuccessCnt}`,
          );
          // 达到限额
          ToastUtil.showDefaultToast('下载额度已用完，已停止下载~');
          logUtil.info('用户下载额度已经用完了，强制停止下载', 'DOWNLOAD');
          await pauseDownload();
          break;
        }
        const { success, fileSuffix } = await downloadCurrent();

        if (
          useDownloadListStore.getState().downloadQueueTaskStatus === 'Pause'
        ) {
          pauseDownload();
          console.log('检测到用户手动暂停下载，已经终止下载队列任务~');
          break;
        } else {
          useDownloadListStore
            .getState()
            .setCurrentDownloadStatus(success ? 'Success' : 'Failed');
          useDownloadListStore.getState().setCurrentDownloadSuffix(fileSuffix);
          console.log(
            `此时的downloadList数据：${JSON.stringify(
              useDownloadListStore.getState().downLoadList,
            )}`,
          );
        }
      } catch (err) {
        logUtil.error(
          `下载歌曲遇到未处理异常，err：${err} 当前下载歌曲：${JSON.stringify(
            useDownloadListStore.getState().getCurrentDownload,
          )}`,
        );
        useDownloadListStore.getState().setCurrentDownloadStatus('Failed');
      }
    }
  } catch (err) {
    logUtil.error(`批量循环下载歌曲遇到异常，err：${err}`);
    useDownloadListStore.getState().setDownloadQueueTaskStatus('Failed');
  }
  console.log('startDownload执行结束');
}

async function downloadCurrent() {
  const currentDownload = useDownloadListStore
    .getState()
    .getCurrentDownload() as DownloadSong;
  if (currentDownload.downloadStatus === 'Success') {
    console.log(`该歌曲${currentDownload.songTitle} 已经下载成功，跳过`);
    return true;
  }
  useDownloadListStore.getState().setCurrentDownloadStatus('Downloading');
  useDownloadListStore.getState().setCurrentDownloadProgress('0%');

  if (
    useDownloadListStore.getInitialState().downloadQueueTaskStatus === 'Pause'
  ) {
    pauseDownload();
    return false;
  }
  const fileName = `${currentDownload?.platform}-${currentDownload?.songTitle}-${currentDownload?.singerName}`;
  const {
    songUrl,
    fileSuffix: fileSuffix,
    songLyric,
  } = await getSongInfo(currentDownload);
  console.log(
    `下载时获取到歌曲信息：songUrl：${songUrl} songLyric:${songLyric} currentSongImg:${currentDownload.songImg}`,
  );
  const songImg = currentDownload.songImg;
  if (isEmpty(songUrl)) {
    logUtil.error('执行startDownload方法获取播放链接的url为空，无法继续下载');
    return false;
  }
  const { success: songDownloadSuccess, path: songDownloadPath } =
    await MyUtils.downLoadFile(songUrl as string, fileName, fileSuffix, true);
  console.log(
    `歌曲下载结果：${songDownloadSuccess} success === true的结果:${
      songDownloadSuccess === true
    }`,
  );
  // 如果歌曲下载成功，尝试保存封面和歌词
  if (
    songDownloadSuccess === true &&
    songImg !== null &&
    songImg !== undefined &&
    currentDownload.songType !== 'sound'
  ) {
    let { success: coverDownloadSuccess, path: coverDownloadPath } =
      await MyUtils.downLoadFile(
        songImg,
        fileName,
        `cover.${getFileExtensionFromUrl(songImg)}` as FileSuffixType,
      );
    console.log(
      `歌曲封面的下载结果：${coverDownloadSuccess} coverDownloadPath:${coverDownloadPath}`,
    );

    const saveLyricsResult = await MyUtils.saveLyrics(songLyric, fileName);
    console.log(`歌词保存结果：${saveLyricsResult}`);
    if (currentDownload.songType === 'music' && fileSuffix === 'high.mp3') {
      console.log('mp3文件，尝试嵌入封面和歌词');
      const mergeResult = await Mp3Tagger.embedTag(
        songDownloadPath,
        songLyric,
        coverDownloadPath,
      );
      console.log(`歌曲合并结果：${mergeResult}`);
    }
  }

  return { success: songDownloadSuccess, fileSuffix };
}

function getFileExtensionFromUrl(url: string): string | null {
  const match = url.match(/\.([a-zA-Z0-9]+)(\?.*)?$/);
  return match ? match[1] : null;
}

async function getSongInfo(currentDownload: DownloadSong) {
  let songUrl, songImg, songLyric;
  let fileSuffix: FileSuffixType = 'high.mp3';
  // 这里要区分music和sound，但目前仅支持music，sound可以不用考虑
  if (currentDownload.songType === 'sound') {
    fileSuffix = 'default.mp3';
    const musicDetail = await MyUtils.handleAsync(
      apiClient.get(
        `/search/sound/detail/${currentDownload.platform}/${currentDownload.songId}`,
      ),
      error => {
        usePlaylistStore.getState().updateCurrentPlay({ isPlaying: false });
        logUtil.error(
          `下载声音时获取播放链接异常，声音信息：${
            currentDownload?.songTitle
          }-${currentDownload?.singerName} 错误信息：${JSON.stringify(error)}`,
          'DOWNLOAD',
        );
      },
    );
    songUrl = musicDetail.data.result?.songUrl;
    songLyric = '抱歉，有声书资源没有歌词~';
  } else {
    // music 逻辑
    let level;
    if (currentDownload.platform === 'WYY') {
      level = usePlaylistStore.getState().currentPlay.wyyConfigLevel;
    } else if (currentDownload.platform === 'QQ') {
      level = usePlaylistStore.getState().currentPlay.qqConfigLevel;
    }
    while (true) {
      const finalLevel =
        currentDownload.platform === 'WYY'
          ? MyUtils.getWyyLevelCodes()[level === undefined ? 0 : level]
          : MyUtils.getQQLevelCodes()[level === undefined ? 0 : level];

      console.log(
        `准备下载这个音质:${finalLevel}的音乐， level:${level} finalLevel:${finalLevel}`,
      );
      if (level !== undefined && level > 0) {
        logUtil.info(
          `用户尝试下载无损音源，平台：${currentDownload.platform} 歌曲名称：${
            currentDownload.songTitle
          } 歌手名称：${currentDownload.singerName} 音源：${
            currentDownload.platform === 'WYY'
              ? MyUtils.getWyyLevelDescs()[level]
              : MyUtils.getQQLevelDescs()[level]
          }`,
          'DOWNLOAD',
        );
      }
      const musicDetail = await MyUtils.handleAsync(
        apiClient.get(
          `/search/music/detail/${currentDownload?.platform}/${currentDownload?.songId}?level=${finalLevel}`,
        ),
        error => {
          logUtil.error(
            `下载歌曲时获取播放链接异常，歌曲信息：${
              currentDownload?.songTitle
            }-${currentDownload?.singerName} 错误信息：${JSON.stringify(
              error,
            )}`,
            'DOWNLOAD',
          );
        },
      );

      // 尝试获取送Url，如果拿不到则需要重试
      songUrl = musicDetail.data.result?.songUrl;
      songImg = musicDetail.data.result?.songImg;
      songLyric = musicDetail.data.result?.songLyric;
      console.log(
        `获取音乐Detail完整响应：${JSON.stringify(musicDetail.data.result)}`,
      );
      if (!isEmpty(songUrl)) {
        const finalLevel = musicDetail.data.result?.finalLevel;

        // 修正level
        if (currentDownload.platform === 'WYY') {
          level =
            finalLevel === undefined ? 0 : MyUtils.getWyyLevelIndex(finalLevel);
        }
        console.log(
          `finalLevel：${finalLevel}获取到了有效的音源链接：${songUrl} finalLevel:${finalLevel} level：${level} 准备退出~`,
        );
        if (level === 1) {
          fileSuffix = 'no-loss.flac';
        } else if (level === 2) {
          fileSuffix = 'surround.flac';
        }
        break;
      }
      if (level === undefined) {
        console.log('用户没有配置高品质音源，无需重试，执行以前的逻辑~');
        break;
      }
      if (level === 0) {
        console.log('已经是最低音质了，无需重试');
        break;
      }
      console.log('不满足循环退出条件，还需要重试~');
      level--;
    }
  }

  return { songUrl, fileSuffix: fileSuffix, songImg, songLyric };
}

async function pauseDownload() {
  useDownloadListStore.getState().setDownloadQueueTaskStatus('Pause');
  useDownloadListStore.getState().setCurrentDownloadStatus('WaitStart');
  useDownloadListStore.getState().setCurrentDownloadProgress('0%');
}

async function initDownload() {
  useDownloadListStore.getState().setDownloadQueueTaskStatus('Pause');
  useDownloadListStore.getState().setCurrentDownloadProgress('0%');
}

export default downloadCore;
