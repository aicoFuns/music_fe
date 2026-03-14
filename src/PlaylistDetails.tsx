import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome6';
import SongList from './SongList';
import AlbumList from './AlbumList';
import apiClient from './utils/ApiClient';
import playerCore from './playerCore';
import ToastUtil from './utils/ToastUtil';
import { isEmpty } from 'lodash';
import {
  colors,
  featureButtonSmall,
  fontSizes,
  iconSizes,
} from './Common.styles';
import MyUtils from './utils/MyUtils';
import logUtil from './utils/LogUtil';
import useDownloadListStore from './global/useDownloadListStore';
import downloadCore from './downloadCore';
import type { Song } from './types/song.type';

const PlaylistDetails = ({ route, navigation }: { route: any; navigation: any }) => {
  console.log(
    `route.params.playListItem:${JSON.stringify(route.params.playListItem)}`,
  );
  let { id, playListId, playListName, type, platform, playListImg } =
    route.params.playListItem;
  const [results, setResults] = useState([]);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const isThirdPlatform = !(type === 'CUSTOM' || type === 'FAVORITE');
  const isFromSearch = type === undefined;
  const pageNum = useRef(1);
  const hasMoreDownData = useRef(true);
  if (isThirdPlatform && type === undefined) {
    type = 'THIRD_PLATFORM';
  }

  const pageSize = 15;
  const pageSizeForBatch = 300;

  const fetchSongs = useCallback(async () => {
    if (!isThirdPlatform) {
      return [];
    }
    const response = await apiClient.get(
      `search/playlist/songs/${platform}/${playListId}/${pageNum.current++}/${pageSize}`,
    );
    return response.data.result;
  }, [platform, playListId]);

  // 获取歌单的歌曲数据
  const fetchPlaylist = async () => {
    console.log(`isThirdPlatform:${isThirdPlatform}`);
    if (isThirdPlatform) {
      setResults(await fetchSongs());
      const allBookmarkedPlaylist = (
        await apiClient.get(`/playlist/all/${type}`)
      ).data.result as Array<any>;
      console.log(
        `获取allBookmarkedPlaylist：${JSON.stringify(allBookmarkedPlaylist)}`,
      );
      setIsBookmarked(
        !isFromSearch ||
          allBookmarkedPlaylist.some(
            item => item.playListId === playListId && item.type === type,
          ),
      );
    } else {
      const response = await apiClient.get(`/playlist/songs/${id}`);
      setResults(response.data.result);
    }
  };

  // 在组件加载时调用 fetchSongs
  useEffect(() => {
    fetchPlaylist();
  }, []);

  const handleBatchDownload = async () => {
    if (isEmpty(results)) {
      ToastUtil.showErrorToast('当前歌单为空~');
      return;
    }
    // ToastUtil.showDefaultToast('准备添加歌曲到下载队列~');
    let songItems = [];
    console.log(`开始下载歌单歌曲，isThirdPlatform:${isThirdPlatform}`);
    if (isThirdPlatform) {
      let tempPageNum = 1;
      while (true) {
        const response = await apiClient.get(
          `search/playlist/songs/${platform}/${playListId}/${tempPageNum}/${pageSizeForBatch}`,
        );
        const pageSongResult = response.data?.result;
        console.log(
          `循环获取歌曲数据，当前pageNum：${tempPageNum} 响应：${pageSongResult?.length}`,
        );
        if (isEmpty(pageSongResult)) {
          console.log(`已经获取到全部歌单歌曲，累计总数：${songItems.length}`);
          break;
        }
        songItems.push(...pageSongResult);
        ToastUtil.showDefaultToast(
          `正在准备歌曲数据，已拉取到${songItems.length}条数据~`,
        );
        tempPageNum++;
      }
    } else {
      const response = await apiClient.get(`/playlist/songs/${id}`);
      songItems = response.data.result;
    }
    console.log(`准备遍历添加歌曲，总长度：${songItems.length}`);
    songItems.forEach(song => {
      useDownloadListStore.getState().addSong(song);
    });
    ToastUtil.showDefaultToast(`已添加${songItems.length}首歌曲到下载队列~`);
    downloadCore.startDownload();
  };

  const handleBatchPlay = async (songItem?: Song) => {
    if (isEmpty(results)) {
      ToastUtil.showErrorToast('当前歌单为空~');
      return;
    }
    let songItems = [];
    if (isThirdPlatform) {
      let tempPageNum = 1;
      while (true) {
        const response = await apiClient.get(
          `search/playlist/songs/${platform}/${playListId}/${tempPageNum}/${pageSizeForBatch}`,
        );
        const pageSongResult = response.data?.result;
        if (isEmpty(pageSongResult)) {
          break;
        }
        songItems.push(...pageSongResult);
        ToastUtil.showDefaultToast(
          `正在准备歌曲数据，已拉取到${songItems.length}条数据~`,
        );
        tempPageNum++;
      }
    } else {
      const response = await apiClient.get(`/playlist/songs/${id}`);
      songItems = response.data.result;
    }
    console.log(`准备遍历添加歌曲，总长度：${songItems.length}`);

    const validItems = songItems.filter(item => item.valid);
    if (isEmpty(validItems)) {
      ToastUtil.showErrorToast('没有可播放的歌曲');
      return;
    }
    let targetIndex = 0;
    if (!isEmpty(songItem)) {
      targetIndex = validItems.findIndex(
        item =>
          item.platform === songItem.platform &&
          item.songId === songItem.songId,
      );
      ToastUtil.showDefaultToast(`即将播放：${songItem.songTitle}`);
    } else {
      ToastUtil.showDefaultToast(`即将播放：${validItems[0].songTitle}`);
    }
    playerCore.clearAndPlayTarget(validItems, targetIndex);
    navigation.navigate('正在播放');
    logUtil.info(`播放歌单：${playListName}`, 'PLAYLIST');
  };

  const handleClickBookremark = async () => {
    if (isBookmarked) {
      // 取消
      await apiClient.post('/playlist/un-bookmark', {
        platform: platform,
        playListId: playListId.toString(),
      });
      ToastUtil.showDefaultToast('已取消收藏');
      logUtil.info('取消收藏', 'PLAYLIST');
    } else {
      // 收藏
      await apiClient.post('/playlist/bookmark', {
        playListName: playListName,
        platform: platform,
        playListId: playListId.toString(),
        playListImg: playListImg,
      });
      ToastUtil.showDefaultToast('已收藏');
      logUtil.info(`收藏歌单：${playListName}`, 'PLAYLIST');
    }
    setIsBookmarked(!isBookmarked);
  };

  const loadMoreData = useCallback(
    async direction => {
      if (direction === 'up') {
        return;
      }
      if (direction === 'down' && !hasMoreDownData.current) {
        console.log('没有更多数据了，不再触发...');
        return;
      }
      if (direction === 'down') {
        const newData = await fetchSongs();
        if (isEmpty(newData)) {
          console.log('newData为空，没有更多数据了');
          hasMoreDownData.current = false;
        }
        setResults(prevData => [...prevData, ...newData]);
      }
    },
    [fetchSongs],
  );

  return (
    <View style={styles.container}>
      <Text style={styles.playListName} numberOfLines={1}>
        {playListName}
      </Text>
      {/* 歌手图片 */}
      <Image
        source={MyUtils.buildPlayListImg(playListImg, type)}
        style={styles.playListImage}
      />

      <View style={styles.playListButtonView}>
        {/* 歌手名字 */}

        <TouchableOpacity
          onPress={() => handleBatchPlay(undefined)}
          style={styles.playListButton}>
          <Text style={styles.playListButtonText}>播放</Text>
          <Icon
            name="play"
            size={iconSizes.normal}
            color={colors.bgWhite}
            style={styles.playListButtonIcon}
          />
        </TouchableOpacity>
        {isThirdPlatform && (
          <TouchableOpacity
            style={styles.playListButton}
            onPress={handleClickBookremark}>
            <Text style={styles.playListButtonText}>收藏</Text>
            <Icon
              name="star"
              size={iconSizes.normal}
              color={isBookmarked ? colors.fontColorRed : colors.fontColorWhite}
              solid={true}
              style={styles.playListButtonIcon}
            />
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.playListButton}
          onPress={handleBatchDownload}>
          <Text style={styles.playListButtonText}>下载</Text>
          <Icon
            name="download"
            size={iconSizes.normal}
            color={colors.fontColorWhite}
            solid={true}
            style={styles.playListButtonIcon}
          />
        </TouchableOpacity>
      </View>

      <SongList
        renderScenario={type === 'FAVORITE' ? 'heartPlayList' : 'playList'}
        songItems={results}
        loadMoreData={loadMoreData}
        hasMoreDownData={hasMoreDownData.current}
        playSongs={handleBatchPlay}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgWhite,
  },
  playListImage: {
    width: 150,
    height: 150,
    borderRadius: 75,
    alignSelf: 'center',
    marginTop: 5,
    marginBottom: 10,
  },
  playListName: {
    fontSize: fontSizes.big,
    //fontWeight: 'bold',
    color: colors.fontColorDrakGray,
    textAlign: 'center',
    marginVertical: 10,
  },
  playListButtonView: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  playListButton: {
    paddingVertical: featureButtonSmall.paddingVertical,
    paddingHorizontal: featureButtonSmall.paddingHorizontal,
    marginHorizontal: 10,

    borderRadius: featureButtonSmall.borderRadius,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgBlue,
  },
  playListButtonText: {
    fontSize: fontSizes.small,
    color: colors.fontColorWhite,
  },

  playListButtonIcon: { marginLeft: 4 },
});

export default PlaylistDetails;
