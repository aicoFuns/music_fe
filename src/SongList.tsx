import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  InteractionManager,
} from 'react-native';
import { Text } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome6';
import playerCore from './playerCore';
import apiClient from './utils/ApiClient';
import ToastUtil from './utils/ToastUtil';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import Modal from 'react-native-modal';
import { produce } from 'immer';
import MyUtils from './utils/MyUtils';
import usePlaylistStore from './global/usePlaylistStore';
import { isEmpty } from 'lodash';
import { EmptyList, Footer } from './FlatListComponent';
import { colors, fontSizes, iconSizes } from './Common.styles';
import logUtil from './utils/LogUtil';
import useDownloadListStore from './global/useDownloadListStore';
import downloadCore from './downloadCore';
import type { Song } from './types/song.type';
import type { DownloadSong } from './types/download.type';

type SongListRenderScenario =
  | 'playList'
  | 'downloadList'
  | 'heartPlayList'
  | 'searchResult'
  | 'playQueue'
  | 'albumList'
  | 'sound';

type SongListProps = {
  renderScenario: SongListRenderScenario;
  songItems: Array<Song>;
  loadMoreData: (direction?: 'up' | 'down') => void | number | Promise<void | number | undefined>;
  setModalClosed?: () => void;
  hasMoreUpData?: boolean;
  hasMoreDownData: boolean;
  playSongs?: (songItem: Song) => void;
  forceTriggerScrollTo?: () => boolean;
  callBack?: (item: Song) => void;
};

const SongList: React.FC<SongListProps> = React.memo(
  ({
    renderScenario,
    songItems,
    loadMoreData,
    setModalClosed = () => {},
    hasMoreUpData = true,
    hasMoreDownData = true,
    playSongs = (songItem: Song) => {},
    forceTriggerScrollTo = () => false,
    callBack = (songItem: Song) => {},
  }) => {
    const navigation = useNavigation(); // 获取 navigation 对象
    // 状态管理
    const [isPlayListModalVisible, setIsPlayListModalVisible] = useState(false);
    const [playList, setPlayList] = useState<PlaylistItem[]>([]);
    const [currentItem, setCurrentItem] = useState<Song | null>(null);
    const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [flatListData, setFlatListData] = useState<Song[]>([]);
    const itemHeight = useRef(0);
    const [flatListReady, setFlatListReady] = useState(false);
    const flatListRef = useRef<FlatList<Song> | null>(null);
    const isRemoving = useRef(false);
    const isLoadingUpData = useRef(false);
    const upIndexChange = useRef(0);
    const isFocused = useIsFocused(); // 检测页面是否处于焦点状态
    const [key, setKey] = useState(0); // 用于强制刷新组件
    const downloadProgress = useDownloadListStore(
      state => state.currentDownloadProgress,
    );

    useEffect(() => {
      if (isFocused) {
        // 页面获得焦点时，触发重新渲染
        setKey(prevKey => prevKey + 1);
      }
    }, [isFocused]);

    useEffect(() => {
      //console.log('触发更新-updateAllBookmarkStatus');
      const updateAllBookmarkStatus = async () => {
        const allBookmarkedSongResult = await apiClient.get(
          '/playlist/all-bookmarked-songs',
        );
        const allBookmarkedSongData = allBookmarkedSongResult.data.result;
        // console.log(
        //   `获取全部收藏歌曲信息：${JSON.stringify(allBookmarkedSongData)}`,
        // );
        const updatedSongItems = songItems.map((item: Song) => ({
          ...item,
          isBookmarked: allBookmarkedSongData.some(
            (bookMarkData: { platform: string; songId: string | number }) =>
              bookMarkData.platform === item.platform &&
              String(bookMarkData.songId) === String(item.songId),
          ),
        }));

        console.log(
          `更新收藏状态，会导致SongList重新渲染，更新数据length:${updatedSongItems.length}`,
        );

        setFlatListData(updatedSongItems); // 更新新的数组到状态
      };
      if (!isEmpty(songItems)) {
        updateAllBookmarkStatus();
      } else {
        setFlatListData(songItems);
      }
    }, [songItems, key]);

    const handleLayout = () => {
      if (
        !flatListReady &&
        (renderScenario === 'playQueue' || renderScenario === 'sound')
      ) {
        setFlatListReady(true);
      }
    };

    const handleOpenPlayListModal = () => {
      setIsPlayListModalVisible(true);
      loadPlaylists(); // 调用 API 加载歌单列表
    };

    // 关闭 Modal
    const handleClosePlayListModal = () => {
      setIsPlayListModalVisible(false);
      setSelectedPlaylistId(null); // 重置选中状态
    };

    const directionRef = useRef<'up' | 'down' | undefined>(undefined);
    useEffect(() => {
      if (
        (renderScenario === 'playQueue' || renderScenario === 'sound') &&
        directionRef.current === 'up'
      ) {
        console.log(
          `准备触发scrollToOffset滚动，位置${JSON.stringify(
            upIndexChange.current,
          )}...`,
        );
        if (renderScenario === 'playQueue' || renderScenario === 'sound') {
          flatListRef.current?.scrollToOffset({
            offset: upIndexChange.current * itemHeight.current,
            animated: false,
          });
        }
        // if (renderScenario === 'sound') {
        //   // todo 这里固定的15条不知道是否有问题？
        //   flatListRef.current?.scrollToOffset({
        //     offset: upIndexChange.current * itemHeight.current,
        //     animated: false,
        //   });
        // }

        isLoadingUpData.current = false;
      }
    }, [flatListData.length]);

    // 加载歌单列表的 API 调用
    const loadPlaylists = async () => {
      setLoading(true); // 开启加载状态
      const response = await apiClient.get('/playlist/all/CUSTOM'); // 替换为真实的 API 地址
      setPlayList(response.data.result); // 设置歌单数据
      setLoading(false); // 关闭加载状态
    };

    // 点击“确定”按钮，调用保存 API
    const handleSave = async () => {
      if (!selectedPlaylistId) {
        console.log('歌单数据为空，无法收藏到歌单');
        return;
      }
      if (isEmpty(currentItem)) {
        console.log('目标歌曲为空，无法收藏到歌单');
        return;
      }

      const item = currentItem;
      await apiClient.post('/playlist/add-song', {
        playListId: selectedPlaylistId,
        platform: item.platform,
        songId: item.songId.toString(),
        songTitle: item.songTitle,
        songImg: item.songImg,
        singerName: item.singerName,
        albumId: item.albumId.toString(),
        albumTitle: item.albumTitle,
        rawDetail: item,
        valid: (item as Song & { valid?: boolean }).valid,
        songType: item.songType,
        addToFavorite: false,
      });
      ToastUtil.showDefaultToast('已收藏');
      updateBookmarkStatus(
        item.platform,
        String(item.songId),
        !item.isBookmarked,
      );
      handleClosePlayListModal();
      logUtil.info(`收藏歌曲：${item.songTitle}`, 'PLAYLIST');
    };

    const updateBookmarkStatus = (
      platform: string,
      songId: string,
      isBookmarked: boolean,
    ) => {
      setFlatListData(prevArray =>
        produce(prevArray, draft => {
          const found = draft.find(
            (el: Song) => el.platform === platform && String(el.songId) === songId,
          );
          if (found) {
            found.isBookmarked = isBookmarked;
          }
        }),
      );
    };

    const removeSong = async (item: Song) => {
      await apiClient.post('/playlist/remove-song', {
        removePlatform: item.platform,
        removeSongRefId: item.songId.toString(),
        removeFromFavorite: renderScenario === 'heartPlayList',
      }); // 替换为真实的 API 地址
      updateBookmarkStatus(item.platform, String(item.songId), !item.isBookmarked);
      //console.log('执行完毕');
      ToastUtil.showDefaultToast('已取消收藏');
      logUtil.info(`取消收藏歌曲：${item.songTitle}`, 'PLAYLIST');
    };

    type PlaylistItem = {
      id: string;
      playListImg?: string;
      type?: string;
      playListName: string;
      createTime: string;
    };

    const renderPlaylistItem = ({ item }: { item: PlaylistItem }) => {
      const isSelected = item.id === selectedPlaylistId;

      return (
        <TouchableOpacity
          style={[
            modalStyles.playlistItem,
            isSelected && modalStyles.selectedPlaylistItem,
          ]}
          onPress={() => setSelectedPlaylistId(item.id)}
        >
          <Image
            source={MyUtils.buildPlayListImg(item.playListImg, item.type)}
            style={modalStyles.playlistImage}
          />
          {/* 右侧文字信息 */}
          <View style={modalStyles.playlistInfo}>
            <Text style={modalStyles.playlistTitle}>{item.playListName}</Text>
            <Text style={modalStyles.playlistDate}>
              创建于 {item.createTime}
            </Text>
          </View>
        </TouchableOpacity>
      );
    };

    useEffect(() => {
      console.log('更新isRemoving为false');
      isRemoving.current = false;
    }, [isRemoving.current]);

    useEffect(() => {
      if (
        flatListRef.current !== null &&
        flatListReady &&
        renderScenario === 'playQueue' &&
        directionRef.current === undefined
      ) {
        const interactionHandle = InteractionManager.runAfterInteractions(
          () => {
            const flatListLength = flatListData.length;
            const playQueue = usePlaylistStore.getState().playList;
            const playIndex =
              usePlaylistStore.getState().currentPlay.playIndex ?? 0;
            let targetIndex = 0;

            // 情况1，元素很少，不可滚动，主流的手机显示9个item都是可以的
            // if (flatListLength <= 9) {
            //   console.log('命中逻辑分支：flatListLength <= 9');
            //   return;
            // }

            // 情况2，元素稍多，但前后数据比例不匀称
            // if (flatListLength < 22) {
            //   const startIndex = playQueue.findIndex(
            //     item =>
            //       flatListData[0].platform === item.platform &&
            //       flatListData[0].songId.toString() === item.songId.toString(),
            //   );
            //   console.log(
            //     `命中逻辑分支：flatListLength < 22, playIndex:${playIndex} startIndex:${startIndex}`,
            //   );
            //   targetIndex = playIndex - startIndex;
            // }

            // 情况3，数据很多，左右对称的
            // if (flatListLength >= 22) {
            //   console.log('命中逻辑分支：flatListLength >= 22');
            //   targetIndex = flatListLength / 2;
            // }
            const startIndex = playQueue.findIndex(
              (qItem: Song) =>
                flatListData[0].platform === qItem.platform &&
                String(flatListData[0].songId) === String(qItem.songId),
            );
            // console.log(
            //   `命中逻辑分支：flatListLength < 22, playIndex:${playIndex} startIndex:${startIndex}`,
            // );
            targetIndex = playIndex - startIndex;

            if (flatListRef.current !== null) {
              const ref = flatListRef.current;
              setTimeout(() => {
                ref.scrollToIndex({
                  index: targetIndex,
                  animated: true,
                  viewPosition: 0.5, // 让目标项居中
                });
              }, 1);
            }
          },
        );
        // 可选：在组件卸载时清除未完成的交互
        return () => interactionHandle.cancel();
      }
      console.log(
        `检测声音专辑是否需要自动滚动~ directionRef.current:${directionRef.current}`,
      );
      // 声音专辑的自动滚动
      console.log(`forceTriggerScrollTo:${forceTriggerScrollTo()}`);
      if (
        flatListRef.current !== null &&
        flatListReady &&
        renderScenario === 'sound' &&
        (directionRef.current === undefined || forceTriggerScrollTo())
      ) {
        console.log('命中的声音专辑的自动滚动逻辑');
        const interactionHandle = InteractionManager.runAfterInteractions(
          () => {
            let targetIndex = flatListData.findIndex(
              (item: Song & { isLatestPlaied?: boolean }) => item.isLatestPlaied === true,
            );
            console.log(
              `${new Date().getMilliseconds()}获取到targetIndex：${targetIndex}`,
            );
            if (flatListRef.current !== null && targetIndex !== -1) {
              setTimeout(() => {
                console.log(
                  `${new Date().getMilliseconds()}执行了滚动，目标index:${targetIndex}`,
                );
                flatListRef.current.scrollToIndex({
                  index: targetIndex,
                  animated: true,
                  viewPosition: 0.5, // 让目标项居中
                });
              }, 1500);
            }
          },
        );
        // 可选：在组件卸载时清除未完成的交互
        return () => interactionHandle.cancel();
      }
    }, [flatListReady, flatListData.length]);

    const isActiveItem = (item: Song & { isLatestPlaied?: boolean }) => {
      if (renderScenario === 'playQueue') {
        return (
          usePlaylistStore.getState().currentPlay.songItem?.songId ===
          item.songId
        );
      }
      if (renderScenario === 'sound') {
        return (item as Song & { isLatestPlaied?: boolean }).isLatestPlaied === true;
      }
      return false;
    };

    const getDownloadIconName = (item: DownloadSong): string => {
      const downloadStatus = item.downloadStatus;
      if (downloadStatus === 'WaitStart') return 'clock';
      if (downloadStatus === 'Success') return 'check';
      if (downloadStatus === 'Failed') return 'rotate-right';
      if (downloadStatus === 'Downloading') return 'download';
      return 'circle-question';
    };

    const getDownloadIconColor = (item: DownloadSong) => {
      const downloadStatus = item.downloadStatus;

      if (downloadStatus === 'WaitStart') {
        return colors.fontColorLightGray;
      } else if (downloadStatus === 'Success') {
        // 下载成功
        return colors.fontColorGreen;
      } else if (downloadStatus === 'Failed') {
        // 下载失败
        return colors.fontColorRed;
      } else if (downloadStatus === 'Downloading') {
        return colors.fontColorBlue;
      }
    };

    const getDownloadText = (item: DownloadSong) => {
      const downloadStatus = item.downloadStatus;

      if (downloadStatus === 'WaitStart') {
        return '等待';
      }
      if (downloadStatus === 'Success') {
        // 下载成功
        if (item.fileSuffixType === 'high.mp3') {
          return '高品质';
        } else if (item.fileSuffixType === 'no-loss.flac') {
          return '无损';
        } else if (item.fileSuffixType === 'surround.flac') {
          if (item.platform === 'WYY') {
            return '环绕声';
          } else if (item.platform === 'QQ') {
            return '全景声';
          }
        }
        return '成功';
      } else if (downloadStatus === 'Failed') {
        // 下载失败
        return '失败';
      } else if (downloadStatus === 'Downloading') {
        return downloadProgress;
      }
    };

    const handleDownloadItem = (item: DownloadSong) => {
      const downloadStatus = item.downloadStatus;
      // 仅仅处理失败的
      if (downloadStatus === 'Failed') {
        useDownloadListStore.getState().retryFailedItem(item);
        downloadCore.startDownload();
        ToastUtil.showDefaultToast(
          `即将重试：${item.platform}-${item.songTitle}-${item.singerName}`,
        );
      }
    };

    const getSongItemWidth = (item: Song): string | number => {
      return item.songType === 'sound' ? '75%' : '70%';
    };

    const getTextColor = (item: Song & { valid?: boolean }) => {
      if (isActiveItem(item)) return 'red';
      if (item.valid) return colors.fontColorDrakGray;
      return colors.fontColorVeryLightGray;
    };

    type SoundSongItem = Song & {
      cacheStatus?: string;
      percentDesc?: string;
      valid?: boolean;
    };

    const handlePlaySound = async (item: SoundSongItem) => {
      if (item.cacheStatus === 'Done') {
        playSongs?.(item);
      } else if (
        item.cacheStatus === 'WaitUpload' ||
        item.cacheStatus === 'Uploading'
      ) {
        ToastUtil.showErrorToast('该声音正在缓存中，请耐心等待~');
      } else if (item.cacheStatus === 'Init') {
        const soundCacheCount = await MyUtils.getSoundCacheSuccess();
        const soundCacheLimit = await MyUtils.getSoundCacheLimt();
        if (soundCacheCount >= soundCacheLimit) {
          ToastUtil.showErrorToast(
            `资源所限，限额每天只能申请缓存${soundCacheLimit}个声音~`,
          );
          return;
        }

        ToastUtil.showDefaultToast('申请缓存成功~');

        setFlatListData(flatListData); // 更新新的数组到状态
        const cacheResponse = await apiClient.post(
          `soundalbum/cache/${item.platform}/${item.songId}`,
        );
        const cacheItemResult = cacheResponse?.data?.result;
        console.log(
          `申请缓存时，后台返回的数据：${JSON.stringify(cacheItemResult)}`,
        );
        const index = flatListData.findIndex(
          (flatItem: Song) => String(flatItem.songId) === String(item.songId),
        );
        if (index >= 0) {
          (flatListData[index] as SoundSongItem).cacheStatus =
            cacheItemResult.cacheStatus;
          (flatListData[index] as SoundSongItem).valid =
            cacheItemResult.cacheStatus === 'Done';
        }
        callBack?.(cacheItemResult);
        await apiClient.post('/utils/user-action', {
          action: 'SOUND-CACHE',
        });
      }
    };

    const renderSong = ({
      item,
      index,
    }: {
      item: Song & { valid?: boolean; cacheStatus?: string; percentDesc?: string };
      index: number;
    }) => (
      <View
        style={styles.songItemContainer}
        onLayout={event => {
          const { height } = event.nativeEvent.layout;
          if (height !== 0 && itemHeight.current === 0) {
            itemHeight.current = height;
          }
        }}>
        <View style={[styles.songItemView, { width: getSongItemWidth(item) as number }]}>
          <Image
            source={MyUtils.buildPlatformImg(item.platform, item.valid)}
            style={styles.songPlatformImg}
          />
          <TouchableOpacity
            onPress={async () => {
              if (renderScenario === 'downloadList') {
                return;
              }

              if (renderScenario === 'sound') {
                handlePlaySound(item);
                // sound的很特殊，单独处理
                return;
              }

              if (!item.valid) {
                ToastUtil.showErrorToast('该平台无版权或者音源，换一首吧~');
                return;
              }
              if (renderScenario === 'playQueue') {
                await playerCore.jumpToTargetItem(item);
                setModalClosed?.();
              } else {
                if (
                  renderScenario === 'albumList' ||
                  renderScenario === 'playList' ||
                  renderScenario === 'heartPlayList'
                ) {
                  await playSongs?.(item);
                } else {
                  await playerCore.addThenPlay(item);
                }
                (navigation as { navigate: (name: string) => void }).navigate(
                  '正在播放',
                );
              }
            }}
            style={styles.songItemButton}>
            <Text
              style={[
                styles.songTitle,
                {
                  color: getTextColor(item),
                  fontWeight: isActiveItem(item) ? 'bold' : 'normal',
                },
              ]}
              numberOfLines={1}>
              {item.songTitle}
            </Text>
            {item.songType !== 'sound' && (
              <Text
                style={{
                  fontSize: fontSizes.small,
                  color: getTextColor(item),
                  flex: 1,
                  fontWeight: isActiveItem(item) ? 'bold' : 'normal',
                }}
                numberOfLines={1}>
                {' '}
                - {item.singerName ?? ''}
              </Text>
            )}
          </TouchableOpacity>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {renderScenario === 'sound' && (
            <Text style={{ fontSize: fontSizes.small }}>
              {item.percentDesc === '100%' ? '播完' : item.percentDesc}
            </Text>
          )}
          {renderScenario !== 'playQueue' &&
            renderScenario !== 'downloadList' &&
            renderScenario !== 'sound' && (
              <TouchableOpacity
                style={styles.downloadButton}
                onPress={() => {
                  if (!item.valid) {
                    ToastUtil.showErrorToast('该平台无版权或者音源，换一首吧~');
                    return;
                  }
                  playerCore.addToQueue(item);
                }}>
                <Icon
                  name="plus"
                  size={iconSizes.normal}
                  color={colors.fontColorDrakGray}
                />
              </TouchableOpacity>
            )}
          {renderScenario === 'sound' && (
            <Icon
              style={{ marginLeft: 3 }}
              name={
                item.cacheStatus === 'Done'
                  ? 'check'
                  : item.cacheStatus === 'Init'
                  ? 'clock'
                  : 'download'
              }
              size={iconSizes.normal}
              color={
                item.valid
                  ? colors.fontColorGreen
                  : colors.fontColorVeryLightGray
              }
            />
          )}
          {renderScenario === 'playQueue' && (
            <TouchableOpacity
              style={styles.downloadButton}
              onPress={() => {
                isRemoving.current = true;
                console.log(
                  `准备删除数据:${JSON.stringify(
                    item,
                  )} 删除前的playList length:${
                    usePlaylistStore.getState().playList.length
                  }`,
                );
                usePlaylistStore.getState().removeSong(item);
                setFlatListData(prevArray =>
                  produce(prevArray, draft => {
                    const removeIndex = draft.findIndex(
                      draftItem =>
                        draftItem.platform === item.platform &&
                        draftItem.songId === item.songId,
                    );
                    console.log(`找到removeIndex:${removeIndex}`);
                    draft.splice(removeIndex, 1);
                  }),
                );
                console.log(
                  `删除后的playList length:${
                    usePlaylistStore.getState().playList.length
                  }`,
                );
                //playerCore.next(false);
              }}>
              <Icon
                name="xmark"
                size={iconSizes.normal}
                color={colors.fontColorRed}
              />
            </TouchableOpacity>
          )}

          {renderScenario !== 'downloadList' && item.songType !== 'sound' && (
            <TouchableOpacity
              style={styles.downloadButton}
              onPress={() => {
                if (!item.valid) {
                  ToastUtil.showErrorToast('该平台没有此歌曲的版权');
                  return;
                }
                if (item.isBookmarked) {
                  removeSong(item);
                } else {
                  setCurrentItem(item);
                  handleOpenPlayListModal();
                }
              }}>
              <Icon
                name={renderScenario === 'heartPlayList' ? 'heart' : 'star'}
                size={iconSizes.normal}
                solid={item.isBookmarked}
                color={
                  item.isBookmarked
                    ? colors.fontColorRed
                    : colors.fontColorDrakGray
                }
              />
            </TouchableOpacity>
          )}
          {renderScenario === 'downloadList' && (
            <TouchableOpacity
              style={styles.downloadStatus}
              onPress={() => handleDownloadItem(item as unknown as DownloadSong)}>
              <Text style={styles.downloadText}>
                {getDownloadText(item as DownloadSong)}
              </Text>
              <Icon
                name={getDownloadIconName(item as DownloadSong) ?? 'circle-question'}
                size={iconSizes.small}
                color={getDownloadIconColor(item as DownloadSong)}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );

    const getItemLayout = (_data: ArrayLike<Song>, index: number) => ({
      length: itemHeight.current,
      offset: itemHeight.current * index,
      index,
    });

    return (
      <View style={styles.songContainer}>
        {/* 歌曲列表 */}
        <FlatList
          ref={flatListRef}
          data={flatListData}
          keyExtractor={(item: Song) => `${item.platform}${item.songId}`}
          renderItem={renderSong}
          getItemLayout={getItemLayout} // 优化滚动性能
          onEndReached={() => {
            console.log('触发down加载事件');
            if (isRemoving.current) {
              console.log('由于本次时间是remove触发，所以不执行');
              return;
            }
            if (isEmpty(flatListData)) {
              console.log('空flatListData触发，所以不执行');
              return;
            }
            directionRef.current = 'down';
            loadMoreData('down');
          }} // 滑到底部加载更多
          onEndReachedThreshold={0.1} // 接近底部时触发加载
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          onLayout={handleLayout} // 确保布局完成后触发
          maxToRenderPerBatch={60} // 每次渲染的最大数量
          updateCellsBatchingPeriod={10} // 批量更新的时间间隔（毫秒）
          windowSize={15} // 可见窗口的大小
          onScroll={async ({ nativeEvent }) => {
            // console.log(
            //   `触发scroll, 此时nativeEvent.contentOffset.y：${nativeEvent.contentOffset.y}`,
            // );
            if (isLoadingUpData.current) {
              // console.log('上一次触发执行中，本次触发忽略');
              return;
            }
            // 检测是否到达顶部
            if (nativeEvent.contentOffset.y <= 0) {
              console.log(
                `触发up加载事件，nativeEvent.contentOffset.y：${nativeEvent.contentOffset.y}`,
              );
              isLoadingUpData.current = true;
              directionRef.current = 'up';
              const upResult = await loadMoreData('up');
              console.log(`向上up滑动后拿到结果：${JSON.stringify(upResult)}`);
              upIndexChange.current =
                typeof upResult === 'number' ? upResult : 0;
              // if (renderScenario === 'sound') {
              //   upIndexChange.current = 15;
              // }
            }
          }}
          ListHeaderComponent={
            !hasMoreUpData &&
            (renderScenario === 'playQueue' || renderScenario === 'sound') &&
            !isEmpty(flatListData) ? (
              <View style={{ paddingBottom: 10, alignItems: 'center' }}>
                <Text style={{ fontSize: 14, color: '#666' }}>
                  -·- 没有更多数据了 -·-
                </Text>
              </View>
            ) : null
          }
          ListFooterComponent={
            !hasMoreDownData && !isEmpty(flatListData) ? <Footer /> : null
          }
          ListEmptyComponent={<EmptyList />}
        />
        {/* 弹窗 Modal */}
        <Modal
          isVisible={isPlayListModalVisible}
          onBackdropPress={handleClosePlayListModal} // 点击外部关闭
          onBackButtonPress={handleClosePlayListModal} // Android 返回键关闭
          style={modalStyles.modal}>
          <View style={modalStyles.modalContent}>
            {/* 标题 */}
            <Text style={modalStyles.modalTitle}>选择歌单</Text>

            {/* 歌单列表 */}
            {loading ? (
              <ActivityIndicator size="large" color={colors.bgBlue} />
            ) : (
              <FlatList
                data={playList}
                keyExtractor={(item: PlaylistItem) => item.id.toString()}
                renderItem={renderPlaylistItem}
              />
            )}

            {/* 底部按钮 */}
            <View style={modalStyles.modalFooter}>
              <TouchableOpacity
                style={modalStyles.modalPlayListButton}
                onPress={() => {
                  handleClosePlayListModal();
                  if (renderScenario === 'playQueue') {
                    setModalClosed?.();
                  }
                  (navigation as { navigate: (name: string) => void }).navigate(
                    '我的收藏',
                  );
                }}>
                <Text style={modalStyles.modalPlayListButtonText}>创建</Text>
                <Icon
                  name="plus"
                  size={iconSizes.normal}
                  color={colors.bgWhite}
                  style={modalStyles.modalPlayListButtonIcon}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={modalStyles.modalPlayListButton}
                onPress={handleSave}>
                <Text style={modalStyles.modalPlayListButtonText}>确定</Text>
                <Icon
                  name="check"
                  size={iconSizes.normal}
                  color={colors.bgWhite}
                  style={modalStyles.modalPlayListButtonIcon}
                />
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    );
  },
);

// 样式定义
const modalStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  openButton: {
    backgroundColor: '#007bff',
    padding: 15,
    borderRadius: 5,
  },

  modal: {
    justifyContent: 'flex-end',
    margin: 0,
  },
  modalContent: {
    backgroundColor: colors.bgWhite,
    padding: 20,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: fontSizes.big,
    textAlign: 'center',
    fontWeight: 'bold',
    marginBottom: 20,
  },
  playlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderWidth: 1,
    borderColor: colors.bgWhite,
    borderRadius: 5,
    marginBottom: 10,
  },
  selectedPlaylistItem: {
    borderColor: colors.bgBlue,
  },
  playlistImage: {
    width: 40,
    height: 40,
    borderRadius: 5,
    marginRight: 10,
  },
  playlistInfo: {
    flex: 1,
  },
  playlistTitle: {
    fontSize: fontSizes.normal,
    fontWeight: 'bold',
  },
  playlistDate: {
    fontSize: fontSizes.verySmall,
    color: '#888',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
  },
  modalPlayListButton: {
    backgroundColor: colors.bgBlue,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 4,
    //flex: 1,
    //marginRight: 10,
    alignItems: 'center',
    flexDirection: 'row',
  },
  modalPlayListButtonText: {
    fontSize: fontSizes.normal,
    color: colors.fontColorWhite,
  },

  modalPlayListButtonIcon: {
    marginLeft: 5,
  },
});

const styles = StyleSheet.create({
  songItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#DDD',
  },
  songItemView: {
    //flex: 1,
    // width: '70%',
    flexDirection: 'row',
  },
  songPlatformImg: {
    height: 20,
    width: 20,
    marginRight: 5,
    marginTop: 2,
  },
  songItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  songTitle: {
    //fontSize: fontSizes.normal,
    fontSize: fontSizes.normal,

    width: 'auto',
    // maxWidth: '80%',
  },
  songName: {
    fontSize: fontSizes.normal,
    color: '#333',
  },
  downloadButton: {
    padding: 5,
    // borderRadius: 5,
    marginHorizontal: 5,
  },

  downloadStatus: {
    padding: 5,
    // borderRadius: 5,
    marginHorizontal: 5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  downloadText: {
    marginRight: 5,
    fontSize: fontSizes.small,
  },

  songContainer: {
    flex: 1,
    paddingHorizontal: 10,
    //height: '65%',
  },
  listContainer: {
    flexGrow: 1,
    // alignItems: 'center',
    // justifyContent: 'center',
    paddingHorizontal: 10,
  },
});

export default SongList;
