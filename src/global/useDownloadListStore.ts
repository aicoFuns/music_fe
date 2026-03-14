import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { produce } from 'immer';
import { isEmpty } from 'lodash';
import ToastUtil from '../utils/ToastUtil';
import type { Song } from '../types/song.type';
import type {
  DownloadSong,
  DownloadQueueTaskStatus,
  CurrentDownloadStatus,
  FileSuffixType,
} from '../types/download.type';

// 定义接口和状态类型
interface useDownloadListStore {
  downLoadList: Array<DownloadSong>;
  isHydrated: boolean; // 标记持久化状态是否已恢复
  downloadQueueTaskStatus: DownloadQueueTaskStatus;
  currentDownloadIndex: number;
  currentDownloadProgress: string;
  setCurrentDownloadIndex: (updatedDownloadIndex: number) => void;
  setCurrentDownloadProgress: (currentDownloadProgress: string) => void;
  getCurrentDownload: () => DownloadSong | null;
  setIsHydrated: () => void;
  setDownloadList: (items: Array<Song>) => void;
  retryFailedItem: (item: DownloadSong) => void;
  retryAllFailedItems: () => void;
  setCurrentDownloadStatus: (
    currentDownloadStatus: CurrentDownloadStatus,
  ) => void;
  setCurrentDownloadSuffix: (fileSuffix: FileSuffixType) => void;
  addSong: (item: Song) => void;
  removeSong: (item: Song) => void;
  setDownloadQueueTaskStatus: (
    downloadQueueTaskStatus: DownloadQueueTaskStatus,
  ) => void;
}

const useDownloadListStore = create<useDownloadListStore>()(
  persist(
    (set, get) => ({
      downLoadList: [], // 搜索历史列表
      isHydrated: false, // 初始值为 false
      currentDownloadIndex: 0,
      downloadQueueTaskStatus: 'Done',
      currentDownloadProgress: '',
      setIsHydrated: () =>
        set(
          produce(state => {
            state.isHydrated = true;
          }),
        ),
      setDownloadList: items =>
        set(
          produce(state => {
            state.downLoadList = items;
          }),
        ),
      retryFailedItem: (failedItem: DownloadSong) => {
        set(
          produce(state => {
            const indexOfFailedItem = state.downLoadList.findIndex(
              (item: DownloadSong) =>
                item.platform === failedItem.platform &&
                item.songId === failedItem.songId,
            );
            console.log(
              `发起失败任务单项重试，indexOfFailedItem：${indexOfFailedItem}`,
            );
            if (indexOfFailedItem !== -1) {
              state.downLoadList[indexOfFailedItem].downloadStatus =
                'WaitStart';
            }
          }),
        );
      },
      retryAllFailedItems: () => {
        set(
          produce(state => {
            state.downLoadList = state.downLoadList.map((item: DownloadSong) => {
              if (item.downloadStatus === 'Failed') {
                item.downloadStatus = 'WaitStart';
              }
              return item;
            });
          }),
        );
      },
      setCurrentDownloadIndex: updatedDownloadIndex =>
        set(
          produce(state => {
            state.currentDownloadIndex = updatedDownloadIndex;
          }),
        ),
      setCurrentDownloadProgress: progress =>
        set(
          produce(state => {
            state.currentDownloadProgress = progress;
          }),
        ),
      setCurrentDownloadStatus: downloadStatus => {
        if (isEmpty(get().downLoadList)) {
          return;
        }
        set(
          produce(state => {
            state.downLoadList[get().currentDownloadIndex].downloadStatus =
              downloadStatus;
          }),
        );
      },
      setCurrentDownloadSuffix: fileSuffixType => {
        if (isEmpty(get().downLoadList)) {
          return;
        }
        set(
          produce(state => {
            state.downLoadList[get().currentDownloadIndex].fileSuffixType =
              fileSuffixType;
          }),
        );
      },
      getCurrentDownload: () => {
        if (isEmpty(get().downLoadList)) {
          return null;
        }
        return get().downLoadList[get().currentDownloadIndex];
      },
      addSong: (item: Song) => {
        // 如果已经存在，不用操作
        const isExist = get().downLoadList.some(
          (existItem: DownloadSong) =>
            existItem.platform === item.platform &&
            existItem.songId.toString() === item.songId.toString(),
        );
        if (isExist) {
          // ToastUtil.showErrorToast(
          //   `此歌曲${item.platform}-${item.songTitle}\n已存在于下载列表，无需添加~`,
          // );
          return;
        }
        set(
          produce(state => {
            const downloadSong = { ...item, downloadStatus: 'WaitStart' };
            //console.log(`添加的歌曲：${JSON.stringify(downloadSong)}`);
            state.downLoadList.push(downloadSong);
          }),
        );
      },

      removeSong: (removeItem: Song) => {
        set(
          produce(state => {
            state.downLoadList = state.downLoadList.filter(
              (item: DownloadSong) =>
                item.platform !== removeItem.platform ||
                item.songId !== removeItem.songId,
            );
          }),
        );
      },
      setDownloadQueueTaskStatus: (
        downloadQueueTaskStatus: DownloadQueueTaskStatus,
      ) =>
        set(
          produce(state => {
            state.downloadQueueTaskStatus = downloadQueueTaskStatus;
          }),
        ),
    }),
    {
      name: 'download-list', // AsyncStorage 中的 key
      storage: {
        getItem: async key => {
          const value = await AsyncStorage.getItem(key);
          return value ? JSON.parse(value) : null; // 反序列化读取的值
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

export default useDownloadListStore;
