import TrackPlayer, {
  useTrackPlayerEvents,
  Event,
  State,
  RepeatMode,
} from 'react-native-track-player';
import usePlaylistStore from './global/usePlaylistStore';
import playerCore from './playerCore';
import ToastUtil from './utils/ToastUtil';
import logUtil from './utils/LogUtil';
import MyUtils from './utils/MyUtils';
import { Platform } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import apiClient from './utils/ApiClient';
import type { Song } from './types/song.type';

// 是否真的被打断了
let reallyStopped = false;

export const useMyTrackPlayerEvents = () => {
  useTrackPlayerEvents(
    [
      Event.PlaybackActiveTrackChanged,
      Event.PlaybackProgressUpdated,
      Event.PlaybackState,
      Event.RemoteDuck,
    ],
    async event => {
      if (event.type === Event.RemoteDuck) {
        if (event.permanent) {
          // 永久中断
          playerCore.pause();
          return;
        }
        if (event.paused) {
          // 永久打断或者临时中断，都直接暂停
          // 当前正在播放音乐，才会进行响应，并且中断停止后恢复
          if (usePlaylistStore.getState().currentPlay.isPlaying) {
            // 正在播放
            playerCore.pause();
            reallyStopped = true;
          }
        } else if (!event.paused) {
          // 上次是真的被打断，才会恢复，否则不管
          if (reallyStopped) {
            playerCore.play();
            reallyStopped = false;
          }
        }
      }
      if (event.type === Event.PlaybackProgressUpdated) {
        // console.log(
        //   `收到播放进度回调：event.position:${event.position} event.duration：${event.duration}`,
        // );
        if (Math.floor(event.position) % 5 === 0) {
          //console.log('保存进度成功');
          // 每5秒保存一次播放进度
          usePlaylistStore.getState().updateCurrentPlay({
            playDuration: event.duration,
            playPosition: event.position,
          });
          // console.log(
          //   `当前播放歌曲信息：${JSON.stringify(
          //     usePlaylistStore.getState().currentPlay,
          //   )}`,
          // );
          const currentPlayItem =
            usePlaylistStore.getState().currentPlay.songItem;
          if (currentPlayItem?.songType === 'sound') {
            // 声音文件需要上传进度，需要考虑可能回调延迟了5秒
            // console.log(
            //   `当前播放的歌曲信息：${JSON.stringify(currentPlayItem)}`,
            // );
            await apiClient.post('/soundalbum/play-history/save', {
              platform: currentPlayItem.platform,
              soundAlbumId:
                currentPlayItem.soundAlbumId || String(currentPlayItem.albumId),
              songId: String(currentPlayItem.songId),
              playDuration: event.duration,
              playPosition: Math.min(event.position + 5, event.duration),
              sort: (currentPlayItem as Song & { sort?: number }).sort,
            });
            //console.log('声音播放进度正常保存成功');
          }
        }
        // 如果有设置跳过片头片尾，则自动跳过
        const songItem = usePlaylistStore.getState().currentPlay.songItem;
        const existSkipItem = usePlaylistStore
          .getState()
          .skipStartEndList?.find(
            existItem =>
              existItem.platform === songItem.platform &&
              existItem.soundAlbumId === songItem.soundAlbumId,
          );
        let finalEndValue = 1.5;
        if (existSkipItem) {
          console.log(
            `这首专辑存在跳过片尾的设置，设置的值为:${existSkipItem.skipEnd}`,
          );
          finalEndValue = existSkipItem.skipEnd;
        }
        // 这里的<=1不能改小，改成0.5或者0.1，有可能出现锁屏后播放不能自动下一曲的问题
        if (event.duration - event.position <= finalEndValue) {
          console.log(
            `该切换下一曲了，event.duration - event.position：${
              event.duration - event.position
            }`,
          );
          // 关闭播放循环模式
          if (Platform.OS === 'android') {
            const systemVersion = DeviceInfo.getSystemVersion();
            const versionNumber = parseFloat(systemVersion);
            if (versionNumber < 13) {
              console.log('此设备版本号小于13');
              await TrackPlayer.setRepeatMode(RepeatMode.Off);
            }
          }
          logUtil.info(
            `自动切换下一曲成功，当前剩余播放时间：${
              event.duration - event.position
            }`,
            'PLAY',
          );
          playerCore.next(true);
        }
      }

      if (
        event.type === Event.PlaybackActiveTrackChanged &&
        event.index != null
      ) {
        // 可以添加你的逻辑
      }

      if (event.type === Event.PlaybackState) {
        if (event.state === State.Error) {
          usePlaylistStore.getState().updateCurrentPlay({
            isPlaying: false,
            playPosition: 0,
            trackPlayState: event.state,
          });
          TrackPlayer.seekTo(0);
          TrackPlayer.getActiveTrack().then(item => {
            logUtil.error(
              `播放失败，TrackerPlayer回调了Error状态，播放进度：${
                usePlaylistStore.getState().currentPlay.playPosition
              } 总时长：${
                usePlaylistStore.getState().currentPlay.playDuration
              } 当前歌曲信息：${JSON.stringify(item)} `,
              'PLAY',
            );
          });

          if (
            usePlaylistStore.getState().currentPlay.songItem?.songType ===
            'sound'
          ) {
            ToastUtil.showErrorToast(
              '播放失败，可能因为是试听音源\n即将自动切换下一个声音~',
            );
          } else {
            ToastUtil.showErrorToast(
              '播放失败，可能无版权或者音源缺失\n即将自动切换下一首歌曲~',
            );
          }
          await MyUtils.delay(2);
          playerCore.next(false);
          logUtil.info('已经在播放失败后，自动为用户切换了下一曲~', 'PLAY');
        }
        if (
          event.state === State.Playing ||
          event.state === State.Buffering ||
          event.state === State.Paused
        ) {
          if (event.state === State.Playing) {
            const songItem = usePlaylistStore.getState().currentPlay.songItem;
            logUtil.info(
              `已成功开始播放：${songItem?.platform}-${songItem?.songTitle}-${songItem?.singerName}`,
              'PLAY',
            );
            // 开启播放循环模式
            if (Platform.OS === 'android') {
              const systemVersion = DeviceInfo.getSystemVersion();
              const versionNumber = parseFloat(systemVersion);
              if (versionNumber < 13) {
                console.log('此设备版本号小于13');
                await TrackPlayer.setRepeatMode(RepeatMode.Queue);
              }
            }
          }
          usePlaylistStore.getState().updateCurrentPlay({
            trackPlayState: event.state,
          });
        }
        if (
          event.state === State.Paused ||
          event.state === State.Stopped ||
          event.state === State.Ended
        ) {
        }
      }
    },
  );
};
