import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { produce } from 'immer';
import { State } from 'react-native-track-player';
import logUtil from '../utils/LogUtil';

// 定义接口和状态类型
interface usePlaylistStore {
  playList: Array<Song>;
  isHydrated: boolean; // 标记持久化状态是否已恢复
  currentPlay: CurrentPlay;
  setIsHydrated: () => void;
  setPlaylist: (items: Array<Song>) => void;
  addSong: (item: Song) => void;
  removeSong: (item: Song) => void;
  updateCurrentPlay: (currentPlay: CurrentPlay) => void;
  setCurrentPlay: (currentPlay: CurrentPlay) => void;
  loading: () => boolean;
  skipStartEndList: Array<SkipStartEnd>;
  updateSkipStartEndList: (item: SkipStartEnd) => void;
}

const usePlaylistStore = create<usePlaylistStore>()(
  persist(
    (set, get) => ({
      playList: [], // 搜索历史列表
      skipStartEndList: [],
      isHydrated: false, // 初始值为 false
      currentPlay: {
        isPlaying: false,
        songItem: null,
        playIndex: 0,
        playMode: 0,
        playRate: 1,
        playPosition: 0,
        playDuration: 0,
      },
      setIsHydrated: () =>
        set(
          produce(state => {
            state.isHydrated = true;
          }),
        ),
      setPlaylist: items =>
        set(
          produce(state => {
            state.playList = items;
          }),
        ),
      addSong: item => {
        // 如果已经存在，不用操作
        const isExist = get().playList.some(
          existItem =>
            existItem.platform === item.platform &&
            existItem.songId.toString() === item.songId.toString(),
        );
        if (isExist) {
          console.log(`此歌曲${item.songTitle}已经存在，无需添加...`);
          return;
        }
        set(
          produce(state => {
            if (
              !state.playList.some(
                song =>
                  song.platform === item.platform &&
                  song.songId === item.songId,
              )
            ) {
              state.playList.push(item);
            }
          }),
        );
      },
      removeSong: removeItem => {
        set(
          produce(state => {
            state.playList = state.playList.filter(
              item =>
                item.platform !== removeItem.platform ||
                item.songId !== removeItem.songId,
            );
          }),
        );
      },
      updateCurrentPlay: currentPlay =>
        set(
          produce(state => {
            //console.log(`update前：${JSON.stringify(state.currentPlay)}`);
            state.currentPlay = { ...state.currentPlay, ...currentPlay };
            //console.log(`update后：${JSON.stringify(state.currentPlay)}`);
          }),
        ),
      updateSkipStartEndList(item) {
        set(
          produce(state => {
            // 存在则更新
            const existIndex = state.skipStartEndList.findIndex(
              existItem =>
                existItem.platform === item.platform &&
                existItem.soundAlbumId === item.soundAlbumId,
            );
            if (existIndex === -1) {
              state.skipStartEndList.push(item);
              console.log(`这个数据不存在，准备push：${JSON.stringify(item)}`);
            } else {
              state.skipStartEndList[existIndex] = item;
              console.log(
                `这个数据存在，准备修改数据为：${JSON.stringify(
                  state.skipStartEndList[existIndex],
                )}`,
              );
            }

            // 不存在则push
          }),
        );
      },
      setCurrentPlay: currentPlay =>
        set(
          produce(state => {
            const defaultCurrentPlay = {
              isPlaying: false,
              songItem: null,
              playIndex: 0,
              playDuration: 0,
              playPosition: 0,
              playMode: state.currentPlay.playMode,
            };
            state.currentPlay = { ...defaultCurrentPlay, ...currentPlay };
          }),
        ),
      loading: () => {
        const currentPlay = get().currentPlay;
        if (!currentPlay.isPlaying) {
          // console.log(
          //   `currentPlay.isPlaying:${currentPlay.isPlaying} return false`,
          // );
          return false;
        }
        // console.log(
        //   `currentPlay.trackPlayState:${
        //     currentPlay.trackPlayState
        //   } return结果:${currentPlay.trackPlayState !== State.Playing}`,
        // );
        return currentPlay.trackPlayState !== State.Playing;
      },
    }),
    {
      name: 'play-list', // AsyncStorage 中的 key
      storage: {
        getItem: async key => {
          try {
            const value = await AsyncStorage.getItem(key);
            return value ? JSON.parse(value) : null; // 反序列化读取的值
          } catch (err) {
            logUtil.error(
              '严重异常，初始化的时候，播放列表持久化数据加载失败~',
              'SYSTEM',
            );
          }
        },
        setItem: async (key, value) => {
          await AsyncStorage.setItem(key, JSON.stringify(value)); // 序列化存储的值
        },
        removeItem: async key => {
          await AsyncStorage.removeItem(key); // 删除存储的值
        },
      },
      onRehydrateStorage: () => state => {
        state?.setIsHydrated();
      },
    },
  ),
);

export default usePlaylistStore;
