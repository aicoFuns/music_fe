import TrackPlayer, {
  Capability,
  Event,
  RepeatMode,
} from 'react-native-track-player';
import ToastUtil from './utils/ToastUtil';
import _, { isEmpty } from 'lodash';
import apiClient from './utils/ApiClient';
import usePlaylistStore from './global/usePlaylistStore';
import { PlayMode } from './enums/PlayMode';
import MyUtils from './utils/MyUtils';
import DeviceInfo from 'react-native-device-info';
import { Platform } from 'react-native';
import logUtil from './utils/LogUtil';
import type { Song } from './types/song.type';

async function pause() {
  if (!usePlaylistStore.getState().currentPlay.isPlaying) {
    console.warn('current playing is false, no need excute pause.');
  }
  await TrackPlayer.pause();
  const progress = await TrackPlayer.getProgress();
  usePlaylistStore.getState().updateCurrentPlay({
    isPlaying: false,
    playPosition: progress.position,
    playDuration: progress.duration,
  });
}

async function play() {
  _play();
}

async function prev() {
  logUtil.info('用户切换了上一曲~', 'PLAY');
  const playList = usePlaylistStore.getState().playList;
  if (isEmpty(playList)) {
    ToastUtil.showDefaultToast('播放列表为空');
    return;
  }
  const currentPlay = usePlaylistStore.getState().currentPlay;
  let prevIndex = 0;
  if (
    currentPlay.playMode === PlayMode.Order ||
    currentPlay.playMode === PlayMode.Single
  ) {
    if (currentPlay.playIndex === 0) {
      ToastUtil.showDefaultToast('没有上一曲了~');
      return;
    }
    prevIndex = (currentPlay.playIndex as number) - 1;
  }
  if (currentPlay.playMode === PlayMode.Random) {
    prevIndex = Math.floor(Math.random() * playList.length);
  }
  // 先暂停播放
  await TrackPlayer.pause();
  await _playTargetIndex(prevIndex);
}

async function next(autoNext: boolean) {
  logUtil.info(
    `正在切换下一曲，切换方式：${autoNext ? '自动' : '手动'}`,
    'PLAY',
  );
  const playList = usePlaylistStore.getState().playList;
  if (isEmpty(playList)) {
    ToastUtil.showDefaultToast('播放列表为空');
    if (autoNext) {
      await TrackPlayer.pause();
      usePlaylistStore.getState().updateCurrentPlay({
        isPlaying: false,
        playPosition: 0,
        playDuration: 0,
        songItem: null,
      });
    }
    return;
  }
  const currentPlay = usePlaylistStore.getState().currentPlay;
  if (currentPlay.playMode === PlayMode.Single && autoNext) {
    await TrackPlayer.seekTo(0);
    return;
  }

  let nextIndex = 0;
  if (
    currentPlay.playMode === PlayMode.Order ||
    currentPlay.playMode === PlayMode.Single
  ) {
    if (currentPlay.playIndex === playList.length - 1) {
      ToastUtil.showDefaultToast('没有下一曲了~');
      if (autoNext) {
        usePlaylistStore
          .getState()
          .updateCurrentPlay({ isPlaying: false, playPosition: 0 });
      }
      return;
    }
    nextIndex = (currentPlay.playIndex as number) + 1;
  } else if (currentPlay.playMode === PlayMode.Random) {
    nextIndex = Math.floor(Math.random() * playList.length);
  }
  // console.log(
  //   `确定nextIndex为:${nextIndex} 当前playListLength：${
  //     usePlaylistStore.getState().playList.length
  //   }`,
  // );
  await TrackPlayer.pause();
  await _playTargetIndex(nextIndex);
}

async function jumpToTargetItem(item: Song) {
  const targetIndex = usePlaylistStore
    .getState()
    .playList.findIndex(
      (listItem: Song) =>
        listItem.platform === item.platform &&
        String(listItem.songId) === String(item.songId),
    );
  if (targetIndex === -1) {
    console.log(`该歌曲${item.songTitle}已经不存在于播放列表中...`);
    return;
  }
  const currentPlayIndex =
    usePlaylistStore.getState().currentPlay.playIndex ?? 0;
  if (targetIndex === currentPlayIndex) {
    return;
  }

  _playTargetIndex(targetIndex);
}

async function _playTargetIndex(
  targetIndex: number,
  position = 0,
  forceRefreshUrl = false,
) {
  const playList = usePlaylistStore.getState().playList;
  const planStopAt = usePlaylistStore.getState().currentPlay.planStopAt;
  const playRate = usePlaylistStore.getState().currentPlay.playRate ?? 1;
  const qqLevel = usePlaylistStore.getState().currentPlay.qqConfigLevel;
  const WyyLevel = usePlaylistStore.getState().currentPlay.wyyConfigLevel;
  usePlaylistStore.getState().setCurrentPlay({
    isPlaying: true,
    songItem: playList[targetIndex],
    playIndex: targetIndex,
    playPosition: position,
    planStopAt: planStopAt,
    playRate,
    qqConfigLevel: qqLevel,
    wyyConfigLevel: WyyLevel,
  });
  console.log(`获取到planStopAt：${JSON.stringify(planStopAt)}`);
  await _play(forceRefreshUrl);
}

async function addThenPlay(item: Song) {
  await TrackPlayer.pause();
  ToastUtil.showDefaultToast(`即将播放：${item.songTitle}`);
  usePlaylistStore.getState().addSong(item);
  const playIndex = usePlaylistStore
    .getState()
    .playList.findIndex(
      (playListItem: Song) =>
        playListItem.platform === item.platform &&
        String(playListItem.songId) === String(item.songId),
    );
  usePlaylistStore.getState().updateCurrentPlay({
    playIndex,
    songItem: item,
    playPosition: 0,
  });

  await _play();
}

async function addToPlaylist(item: Song) {
  ToastUtil.showDefaultToast('已添加到播放队列');
  usePlaylistStore.getState().addSong(item);
}

async function clearAndPlayAll(items: Song[]) {
  await clearAndPlayTarget(items, 0);
}

async function clearAndPlayTarget(
  items: Song[],
  targetIndex: number,
  position = 0,
) {
  console.log(`此时的position为${position}`);
  if (_.isEmpty(items)) {
    ToastUtil.showErrorToast('沒有数据，无法播放...');
    return;
  }
  usePlaylistStore.getState().setPlaylist(items);
  // 同时把trackerPlayer所有数据清空
  // await pause();
  await TrackPlayer.reset();
  await _playTargetIndex(targetIndex, position);
}

async function swithMusicLevel(position: number) {
  // 切换音源品质
  const currentPlayIndex = usePlaylistStore.getState().currentPlay.playIndex;
  console.log(
    `准备执行跳转播放，index:${currentPlayIndex} posiiton:${position}`,
  );
  logUtil.info('用户尝试切换无损音源', 'PLAYLIST');
  await _playTargetIndex(currentPlayIndex, position, true);
}

async function togglePlayOrPause() {
  if (usePlaylistStore.getState().currentPlay.isPlaying) {
    const progress = await TrackPlayer.getProgress();
    usePlaylistStore.getState().updateCurrentPlay({
      playDuration: progress.duration,
      playPosition: progress.position,
    });
    // 暂停
    await pause();
  } else {
    // 播放
    await play();
  }
}

const playerCore = {
  play: play,
  prev: prev,
  next: next,
  pause: pause,
  jumpToTargetItem: jumpToTargetItem,
  addThenPlay: addThenPlay,
  addToQueue: addToPlaylist,
  clearAndPlayAll: clearAndPlayAll,
  clearAndPlayTarget: clearAndPlayTarget,
  togglePlayOrPause: togglePlayOrPause,
  setPlayRate: setPlayRate,
  switchMusicLevel: swithMusicLevel,
  hifiLimt: hifiLimit,
  hifiPlaied: hifiPlaied,
  musicLimit: musicLimit,
  musicPlaied: musicPlaied,
  soundLimit: soundLimit,
  soundPlaied: soundPlaied,
};

async function hifiLimit() {
  const result = await apiClient.get('/utils/no-loss/limit');
  return result.data.result;
}

async function hifiPlaied() {
  const result = await apiClient.get(
    '/utils/user-action/count/day?action=HIFI-SUCCESS',
  );
  return result.data.result;
}

async function musicLimit() {
  const result = await apiClient.get('/utils/music/limit');
  return result.data.result;
}

async function musicPlaied() {
  const result = await apiClient.get(
    '/utils/user-action/count/day?action=MUSIC-URL-SUCCESS',
  );
  return result.data.result;
}

async function soundLimit() {
  const result = await apiClient.get('/utils/sound/limit');
  return result.data.result;
}

async function soundPlaied() {
  const result = await apiClient.get(
    '/utils/user-action/count/day?action=SOUND-URL-SUCCESS',
  );
  return result.data.result;
}

//let initedTrackerPlayer: boolean = false;

export async function initTrackPlayer() {
  // if (initedTrackerPlayer) {
  //   logUtil.info(
  //     '执行initTrackPlayer时，initedTrackerPlayer=true，本次执行跳过',
  //   );
  //   return;
  // }
  try {
    //initedTrackerPlayer = true;
    await _initTrackPlayer();
    logUtil.info('initTrackPlayer执行正常结束', 'PLAY');
  } catch (err) {
    // logUtil.error(
    //   `initTrackPlayer执行异常，此异常被忽略，err：${JSON.stringify(err)}`,
    //   'PLAY',
    // );
  }
}

async function setPlayRate(rate: number) {
  console.log(`准备设置播放速度为${rate}~`);
  usePlaylistStore.getState().updateCurrentPlay({ playRate: rate });
  await TrackPlayer.setRate(rate);
}

async function _initTrackPlayer() {
  await TrackPlayer.setupPlayer();
  // 设置播放速度
  const playRate = usePlaylistStore.getState().currentPlay.playRate;

  if (playRate !== undefined && playRate > 1) {
    console.log(`准备设置playRate:${playRate}`);
    await TrackPlayer.setRate(playRate);
  }
  let ablities = [
    Capability.Play,
    Capability.Pause,
    Capability.SkipToNext, // 启用 Next 按钮
    Capability.SkipToPrevious, // 启用 Previous 按钮
  ];
  // 配置播放器选项
  await TrackPlayer.updateOptions({
    capabilities: ablities,
    compactCapabilities: ablities,
    progressUpdateEventInterval: 1,
  });
  // 添加自定义事件监听器
  TrackPlayer.addEventListener(Event.RemoteNext, async () => {
    await next(false);
  });

  TrackPlayer.addEventListener(Event.RemotePrevious, async () => {
    await prev();
  });

  TrackPlayer.addEventListener(Event.RemotePlay, async () => {
    await play();
  });

  TrackPlayer.addEventListener(Event.RemotePause, async () => {
    await pause();
  });

  if (Platform.OS === 'android') {
    const systemVersion = DeviceInfo.getSystemVersion();
    const versionNumber = parseFloat(systemVersion);
    if (versionNumber < 13) {
      console.log('此设备版本号小于13');
      await TrackPlayer.setRepeatMode(RepeatMode.Queue);
    }
  }
}

function isUrlOutDate(lastRefreshTime: Date): boolean {
  const timeDiff = Math.abs(
    new Date().getTime() - new Date(lastRefreshTime).getTime(),
  );
  // 暂时设定60分钟过期
  return timeDiff > 30 * 60 * 1000;
}

async function _play(forceRefreshUrl = false) {
  await initTrackPlayer();
  await _tryPlay(forceRefreshUrl);
  // try {
  //   await _tryPlay(forceNotRefreshUrl);
  // } catch (err) {
  //   logUtil.error(
  //     `执行_tryPlay遇到异常，initedTrackerPlayer：${initedTrackerPlayer} error：${JSON.stringify(
  //       err,
  //     )}`,
  //     'PLAY',
  //   );
  //   if (err?.code === 'player_not_initialized') {
  //     logUtil.error(
  //       `执行_tryPlay遇到异常，initedTrackerPlayer：${initedTrackerPlayer} errCode=player_not_initialized 将会重试initTrackPlayer`,
  //     );
  //     initedTrackerPlayer = false;
  //     await initTrackPlayer();
  //     await _tryPlay(forceNotRefreshUrl);
  //   }
  // }
}

async function _tryPlay(forceRefreshUrl = false) {
  const currentPlay = usePlaylistStore.getState().currentPlay;
  console.log(
    `currentPlay.songItem.urlRefreshTime:${JSON.stringify(
      currentPlay.songItem?.urlRefreshTime,
    )}`,
  );
  // 检查currentPlay信息，有数据继续播放，没数据从头开始从0播放
  if (!isEmpty(currentPlay.songItem)) {
    if (currentPlay.playPosition !== 0) {
      if (
        (!isEmpty(currentPlay.songItem.urlRefreshTime) &&
          isUrlOutDate(currentPlay.songItem.urlRefreshTime as Date)) ||
        currentPlay.songItem.songType === 'sound' ||
        forceRefreshUrl
      ) {
        console.log(
          `重新刷新url，并且播放指定position：${currentPlay.playPosition}`,
        );
        refreshMusicDetailThenPlay(
          currentPlay.songItem,
          currentPlay.playIndex,
          currentPlay.playPosition,
        );
        return;
      }

      // 继续播放，但需要检测当前队列是不是为空，有可能用户刚刷新url就退出了
      const currentTrackerQueue = await TrackPlayer.getQueue();
      if (isEmpty(currentTrackerQueue)) {
        await TrackPlayer.setQueue([]);
        await TrackPlayer.add({
          ...currentPlay.songItem,
          title: currentPlay.songItem.songTitle,
          artist: currentPlay.songItem.singerName,
          artwork: currentPlay.songItem.songImg,
        });
        await TrackPlayer.seekTo(currentPlay.playPosition as number);
      }

      await TrackPlayer.play();
      usePlaylistStore.getState().updateCurrentPlay({ isPlaying: true });
      logUtil.info(
        `继续播放：${currentPlay.songItem?.songTitle}-${currentPlay.songItem?.singerName}`,
        'PLAY',
      );
      return;
    } else {
      refreshMusicDetailThenPlay(
        currentPlay.songItem,
        currentPlay.playIndex ?? 0,
      );
      return;
    }
  }

  if (!isEmpty(usePlaylistStore.getState().playList)) {
    const songItem = usePlaylistStore.getState().playList[0];
    refreshMusicDetailThenPlay(songItem, 0);
    console.log('play default 0 index song from 0 second.');
    return;
  }
  ToastUtil.showDefaultToast('播放列表为空');
  return;
}

async function refreshMusicDetailThenPlay(
  songItem: Song,
  playIndex: number,
  position: number = 0,
) {
  // console.log(`songItem:${JSON.stringify(songItem)}`);
  try {
    let musicDetail;
    if (isEmpty(songItem.songType) || songItem.songType === 'music') {
      const musicPlaiedCnt = await musicPlaied();
      const musicLimitCnt = await musicLimit();
      // 如果播放次数超过限制，直接异常
      if (musicPlaiedCnt >= musicLimitCnt) {
        console.log(
          `音乐播放已经超过限制，musicPlaiedCnt:${musicPlaiedCnt} musicLimitCnt:${musicLimitCnt}`,
        );
        logUtil.info(
          `用户播放音乐超过限额，当前：${musicPlaiedCnt} 限额：${musicLimitCnt}`,
          'PLAY',
        );
        ToastUtil.showErrorToast(
          `抱歉，今天播放额度已使用完了\n限额${musicLimitCnt}首歌曲，已播放${musicPlaiedCnt}首`,
        );
        throw { message: '播放音乐的额度使用完了', code: 'OVER-LIMIT' };
      }

      let level;
      if (songItem.platform === 'WYY') {
        level = usePlaylistStore.getState().currentPlay.wyyConfigLevel;
      } else if (songItem.platform === 'QQ') {
        level = usePlaylistStore.getState().currentPlay.qqConfigLevel;
      }

      // 如果已经超额，固定降级为高品质
      if ((await hifiPlaied()) >= (await hifiLimit())) {
        console.log('已经超过限制了，自动降级为高品质音乐~');
        level = 0;
        logUtil.info('用户无损额度超过限制，已被强制降级', 'PLAY');
      }

      while (true) {
        const finalLevel =
          songItem.platform === 'WYY'
            ? MyUtils.getWyyLevelCodes()[level === undefined ? 0 : level]
            : MyUtils.getQQLevelCodes()[level === undefined ? 0 : level];
        //需要重新获取数据进行播放
        console.log(`准备获取这个音质:${finalLevel}的音乐， level:${level}`);
        if (level !== undefined && level > 0) {
          // 用户尝试无损
          logUtil.info(
            `用户尝试播放无损音源，平台：${songItem.platform} 歌曲名称：${
              songItem.songTitle
            } 歌手名称：${songItem.singerName} 音源：${
              songItem.platform === 'WYY'
                ? MyUtils.getWyyLevelDescs()[level]
                : MyUtils.getQQLevelDescs()[level]
            }`,
            'PLAY',
          );
        }
        musicDetail = await MyUtils.handleAsync(
          apiClient.get(
            `/search/music/detail/${songItem.platform}/${songItem.songId}?level=${finalLevel}`,
          ),
          error => {
            usePlaylistStore.getState().updateCurrentPlay({ isPlaying: false });
            logUtil.error(
              `执行_play方法获取播放链接异常，歌曲信息：${
                songItem?.songTitle
              }-${songItem?.singerName} 错误信息：${JSON.stringify(error)}`,
              'PLAY',
            );
          },
        );

        // 尝试获取送Url，如果拿不到则需要重试
        const tempSongUrl = musicDetail?.data?.result?.songUrl;
        console.log(
          `获取音乐Detail完整响应：${JSON.stringify(
            musicDetail?.data?.result,
          )}`,
        );
        if (!isEmpty(tempSongUrl)) {
          const responeFinalLevel = musicDetail.data.result?.finalLevel;
          console.log(
            `finalLevel：${responeFinalLevel}获取到了有效的音源链接：${tempSongUrl} finalLevel:${responeFinalLevel} 准备退出~`,
          );
          if (level !== undefined && level > 0) {
            // 用户尝试无损成功
            console.log('用户尝试无损音源成功，准备计数+1');
            await apiClient.post('/utils/user-action', {
              action: 'HIFI-SUCCESS',
            });
          }

          if (songItem.platform === 'WYY') {
            console.log(
              `为网易云转换index：${MyUtils.getWyyLevelIndex(
                responeFinalLevel,
              )}`,
            );

            usePlaylistStore.getState().updateCurrentPlay({
              wyyFinalLevel:
                responeFinalLevel === undefined
                  ? 0
                  : MyUtils.getWyyLevelIndex(responeFinalLevel),
            });
          }
          if (songItem.platform === 'QQ') {
            usePlaylistStore.getState().updateCurrentPlay({
              qqFinalLevel: level,
            });
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
    } else if (songItem.songType === 'sound') {
      const soundPlaiedCnt = await soundPlaied();
      const soundLimitCnt = await soundLimit();
      // 如果播放次数超过限制，直接异常
      if (soundPlaiedCnt >= soundLimitCnt) {
        console.log(
          `声音播放已经超过限制，soundPlaiedCnt:${soundPlaiedCnt} soundLimitCnt:${soundLimitCnt}`,
        );
        ToastUtil.showErrorToast(
          `抱歉，今天播放额度已使用完了\n限额${soundLimitCnt}个声音，已播放${soundPlaiedCnt}个`,
        );
        logUtil.info(
          `用户播放声音超过限额，当前：${soundPlaiedCnt} 限额：${soundLimitCnt}`,
          'PLAY',
        );
        throw { message: '播放声音的额度使用完了', code: 'OVER-LIMIT' };
      }

      //需要重新获取数据进行播放
      musicDetail = await MyUtils.handleAsync(
        apiClient.get(
          `/search/sound/detail/${songItem.platform}/${songItem.songId}`,
        ),
        error => {
          usePlaylistStore.getState().updateCurrentPlay({ isPlaying: false });
          logUtil.error(
            `执行_play方法获取播放链接异常，歌曲信息：${songItem?.songTitle}-${
              songItem?.singerName
            } 错误信息：${JSON.stringify(error)}`,
            'PLAY',
          );
        },
      );
      // 如果有设置跳过片头片尾，则自动跳过
      const existSkipItem = usePlaylistStore
        .getState()
        .skipStartEndList?.find(
          existItem =>
            existItem.platform === songItem.platform &&
            existItem.soundAlbumId === songItem.soundAlbumId,
        );
      if (!isEmpty(existSkipItem)) {
        console.log(
          `该专辑检测到了跳过片头的设置，跳过：${existSkipItem.skipStart}`,
        );
        position = Math.max(existSkipItem.skipStart, position);
      }
    }

    const result = musicDetail?.data?.result;
    const somgImg = isEmpty(result?.songImg)
      ? songItem.songImg
      : result.songImg;
    if (isEmpty(result?.songUrl)) {
      logUtil.error(
        `没有获取到音源，平台：${songItem.platform} songId：${songItem.songId} songTitle：${songItem.songTitle} singerName：${songItem.singerName}`,
        'PLAY',
      );
    } else {
      // 这里记录获取音源成功的次数
      console.log('用户获取音源成功，准备计数+1');
      const actionType =
        songItem.songType === 'sound'
          ? 'SOUND-URL-SUCCESS'
          : 'MUSIC-URL-SUCCESS';
      await apiClient.post('/utils/user-action', {
        action: actionType,
      });
    }
    songItem = {
      ...songItem,
      songImg: somgImg,
      url: isEmpty(result?.songUrl)
        ? songItem.songType === 'music' || isEmpty(songItem.songType)
          ? require('./assets/mp3/music-tip.mp3')
          : require('./assets/mp3/sound-tip.mp3')
        : result.songUrl,
      songLyric: result?.songLyric,
      urlRefreshTime: new Date(),
    };
  } catch (err: unknown) {
    const e = err as { message?: string; stack?: string; code?: string };
    logUtil.error(
      `获取播放链接发生异常，准备替换为失败默认音源，错误信息：${e?.message ?? ''} 堆栈：${e?.stack ?? ''}`,
    );

    let url;
    if (e.code === 'OVER-LIMIT') {
      console.log('播放次数超过限制了，准备替换音源~');
      url = require('./assets/mp3/over-limit.mp3');
    } else if (songItem.songType === 'sound') {
      url = require('./assets/mp3/sound-tip.mp3');
      ToastUtil.showErrorToast('播放失败，可能因为该声音需单独付费~');
    } else {
      url = require('./assets/mp3/music-tip.mp3');
      ToastUtil.showErrorToast('播放失败，可能因为无版权或者属于数字专辑歌曲~');
    }

    songItem = {
      ...songItem,
      songImg: require('./assets/images/record.png'),
      url: url,
      urlRefreshTime: new Date(),
    };
  }

  // todo 这里要考虑无损的音源了
  // 如果有本地音乐数据，则使用本地的数据播放
  // const fileName = `${songItem.platform}-${songItem.songTitle}-${songItem.singerName}`;
  // if (
  //   (await MyUtils.checkFileExists(fileName)) &&
  //   (await MyUtils.checkStoragePermission())
  // ) {
  //   songItem.url = MyUtils.getFilePath(fileName);
  //   logUtil.info(
  //     `歌曲文件：${fileName}在本地已下载并且授予了存储权限，将使用本地文件，完整路径：${songItem.url}`,
  //   );
  // }
  // console.log(`此时的songImg：${JSON.stringify(songItem.songImg)}`);
  // console.log(`此时的songUrl：${JSON.stringify(songItem.url)}`);
  usePlaylistStore.getState().updateCurrentPlay({
    isPlaying: true,
    songItem: songItem,
    playIndex: playIndex,
  });
  await TrackPlayer.setQueue([]);
  await TrackPlayer.add({
    ...songItem,
    title: songItem.songTitle,
    artist: songItem.singerName,
    artwork: songItem.songImg,
  });
  await TrackPlayer.seekTo(position);
  await TrackPlayer.play();
  logUtil.info(
    `成功触发播放：${songItem.songTitle}-${songItem.singerName}`,
    'PLAY',
  );
}

export default playerCore;
