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
  featureButtonNormal,
  fontSizes,
  iconSizes,
} from './Common.styles';
import MyUtils from './utils/MyUtils';
import logUtil from './utils/LogUtil';
import type { Song } from './types/song.type';
import useDownloadListStore from './global/useDownloadListStore';
import downloadCore from './downloadCore';
import { produce } from 'immer';
import usePlaylistStore from './global/usePlaylistStore';
import Modal from 'react-native-modal';

type SortType = 'ASC' | 'DESC';

type PlayHistory = {
  platform: string;
  soundAlbumId: string;
  songId: string;
  userId: number;
  playDuration: number;
  playPosition: number;
  percentDesc: string;
};

type CacheStatus = 'Not-Found' | 'Init' | 'WaitUpload' | 'Uploading' | 'Done';

type CacheDetailSoundAlbumDto = {
  platform: string;

  soundAlbumId: string;

  cacheStatus: CacheStatus;

  cacheCheckDate?: Date;

  countOfSounds?: number;

  cachedSounds?: number;

  cachingSounds?: number;
};

const SoundAlbumDetails = ({ route, navigation }) => {
  //console.log(`route.params.item:${JSON.stringify(route.params.item)}`);
  const soundAlbumItem = route.params.item;
  let { id, albumId, albumTitle, type, platform, albumImg } = route.params.item;
  //console.log(`albumId:${albumId}`);
  const [results, setResults] = useState([]);
  const [sort, setSort] = useState<SortType>('ASC');
  const [isBookmarked, setIsBookmarked] = useState(false);
  const isThirdPlatform = true;
  const isFromSearch = type === undefined;
  const pageNum = useRef(1);
  const pageNumUp = useRef(1);
  const pageNumDown = useRef(1);
  const indexOfLatestPlay = useRef(-1);
  const hasMoreDownData = useRef(true);
  const hasMoreUpData = useRef(true);
  const sortChanged = useRef(false);
  const [cacheDetail, setCacheDetail] = useState<CacheDetailSoundAlbumDto>();
  const [refreshPage, setRefreshPage] = useState<any>();
  const [noteModalVisible, setNoteModalVisible] = useState(false);

  // useEffect(() => {
  //   // if (lastSort.current !== sort) {
  //   //   console.log(`sort发生了变化，lastSort:${lastSort.current} sort:${sort}`);
  //   //   sortChanged.current = true;
  //   // }
  //   sortChanged.current = lastSort.current !== sort;
  //   console.log(`sort发生了变化，lastSort:${lastSort.current} sort:${sort}`);
  //   lastSort.current = sort;
  // }, [sort]);

  useEffect(() => {
    console.log(`触发sortChanged更改，当前值:${sortChanged.current}`);
    if (sortChanged) {
      const timer = setTimeout(() => {
        sortChanged.current = false;
      }, 2500); // 立即重置，也可根据需要设置延迟
      return () => clearTimeout(timer);
    }
  }, [sort]);

  // 模拟获取数据的函数
  const fetchData = () => {
    // 暂时关闭刷新
    setRefreshPage(new Date()); // 这里只是简单地显示当前时间
  };

  // 设置定时器，每5秒钟更新一次数据
  useEffect(() => {
    // 首次加载时立即获取一次数据
    fetchData();

    // 设置定时器，每5秒刷新一次
    const intervalId = setInterval(() => {
      fetchData();
    }, 5000);

    // 清理定时器
    return () => clearInterval(intervalId);
  }, []); // 依赖空数组，表示仅在组件挂载和卸载时执行

  if (isThirdPlatform && type === undefined) {
    type = 'THIRD_PLATFORM';
  }

  const pageSize = 15;
  const bookMarkLimit = useRef(0);
  const soundCacheLimit = useRef(0);
  const pageSizeForBatch = 300;
  const fetchSongs = useCallback(async () => {
    const response = await apiClient.post(
      `search/sounds/${platform}?pageNum=${pageNum.current++}&pageSize=${pageSize}&sort=${sort}`,
      { ...soundAlbumItem },
    );
    return response.data.result;
  }, [platform, sort, soundAlbumItem]);

  const fecthPlayHistory = async () => {
    const response = await apiClient.get(
      `soundalbum/play-history/all/${platform}/${albumId}`,
    );
    // console.log(`获取到历史播放数据：${JSON.stringify(response.data.result)}`);
    const playHistorys = response.data.result;
    if (isEmpty(playHistorys)) {
      console.log('playHistorys为空，当前什么都不需要做~');
      return;
    }

    // 更新当前列表的播放进度数据
    setResults(prevArray =>
      produce(prevArray, draft => {
        for (const playHistory of playHistorys) {
          const targetSound = draft.find(
            item => String(item.songId) === String(playHistory.songId),
          );
          // console.log(`从声音列表匹配数据：${JSON.stringify(targetSound)}`);
          // console.log(`当前playHistory:${JSON.stringify(playHistory)}`);
          // console.log(`当前draft：${JSON.stringify(draft)}`);
          if (targetSound) {
            targetSound.percentDesc = playHistory.percentDesc;
            targetSound.position = playHistory.playPosition;
            //console.log(`更新后的targetSound：${JSON.stringify(targetSound)}`);
          }
        }
      }),
    );
  };

  // 获取声音列表数据
  const fetchSoundlist = async () => {
    const allBookmarkedSoundAlbums = (await apiClient.get('/soundalbum/all'))
      .data.result as Array<any>;
    // console.log(
    //   `获取allBookmarkedSoundAlbums：${JSON.stringify(
    //     allBookmarkedSoundAlbums,
    //   )}`,
    // );
    setIsBookmarked(
      !isFromSearch ||
        allBookmarkedSoundAlbums.some(
          item =>
            String(item.albumId) === String(albumId) &&
            item.platform === platform,
        ),
    );
    // 这里开始检查，缓存状态
    const cacheResponse = await apiClient.get(
      `soundalbum/cache-detail/${platform}/${albumId}`,
    );

    const cacheResult = cacheResponse.data.result as CacheDetailSoundAlbumDto;
    // console.log(`获取到专辑缓存数据：${JSON.stringify(cacheResult)}`);
    setCacheDetail(cacheResult);
    if (cacheResult.cacheStatus !== 'Done') {
      setResults([]);
      if (cacheResult.cacheStatus === 'Not-Found') {
        bookMarkLimit.current = await MyUtils.getSoundBookmarkLimt();
        soundCacheLimit.current = await MyUtils.getSoundCacheLimt();
        setNoteModalVisible(true);
      }
      return;
    }

    const response = await apiClient.get(
      `soundalbum/play-history/all/${platform}/${albumId}`,
    );
    // console.log(`获取到历史播放数据：${JSON.stringify(response.data.result)}`);
    const playHistorys = response.data.result as Array<any>;
    if (isEmpty(playHistorys)) {
      // 从来没有播放过，只需要展示前15条数据即可
      console.log(
        `此时的pageNum.current:${pageNum.current} pageNumUp.current:${pageNumUp.current} pageNumDown.current:${pageNumDown.current}`,
      );
      const soundItems = await fetchSongs();
      setResults(soundItems);
    } else {
      ToastUtil.showDefaultToast('正在定位到上次播放，请稍候~');
      // 有播放数据，尝试定位到这个播放记录
      const latestOne = playHistorys
        .sort(
          (a, b) =>
            new Date(b.updateTime).getTime() - new Date(a.updateTime).getTime(),
        )
        .find(() => true);
      // console.log(`获取到最新的播放数据：${JSON.stringify(latestOne)}`);
      // 如果首次加载的就包含最新的数据了，则无需拉取了
      indexOfLatestPlay.current = (latestOne as { sort?: number })?.sort;
      if (indexOfLatestPlay.current === undefined) {
        console.log('异常情况，当前的indexOfLatestPlay.current===undefined');
        indexOfLatestPlay.current = 0;
      }
      console.log(
        `获取indexOfLatestPlay.current的值:${indexOfLatestPlay.current}`,
      );

      const countOfSounds = soundAlbumItem.countOfSounds;
      // 计算pageNumber
      if (sort === 'ASC') {
        // 升序
        pageNum.current = Math.ceil(indexOfLatestPlay.current / pageSize);
        console.log(
          `当前是ASC顺序，indexOfLatestPlay.current:${indexOfLatestPlay.current} pageNum.current:${pageNum.current}`,
        );
      } else {
        // 降序
        pageNum.current = Math.ceil(
          (countOfSounds - indexOfLatestPlay.current) / pageSize,
        );
        console.log(
          `当前是DESC顺序，indexOfLatestPlay.current:${indexOfLatestPlay.current} countOfSounds:${countOfSounds} pageNum.current:${pageNum.current}`,
        );
      }
      pageNumUp.current = pageNum.current - 2 > 0 ? pageNum.current - 2 : 1;
      pageNumDown.current = pageNum.current + 2;
      console.log(
        `准备拉取这几页数据，pageNumUp.current:${pageNumUp.current} pageNumDown.current:${pageNumDown.current}`,
      );
      const soundItems = [];
      for (
        let currentPageNum = pageNumUp.current;
        currentPageNum <= pageNumDown.current;
        currentPageNum++
      ) {
        console.log(`准备拉取currentPageNum：${currentPageNum}的数据`);
        pageNum.current = currentPageNum;
        const newSoundItems = await fetchSongs();
        soundItems.push(...newSoundItems);
      }

      const targetIndex = soundItems.findIndex(
        item => String(item.songId) === String(latestOne.songId),
      );
      console.log(
        `获取到targetIndex：${targetIndex} latestOne.songId：${latestOne.songId} soundItems:}`,
      );
      soundItems[targetIndex].isLatestPlaied = true;
      hasMoreUpData.current = pageNumUp.current !== 1;

      setResults(soundItems);
      // while (indexOfLatestPlay.current === -1) {
      //   const newSongItems = await fetchSongs();
      //   if (isEmpty(newSongItems)) {
      //     break;
      //   }
      //   soundItems.push(...newSongItems);
      //   // 如果新拉取的数据包含最新的条目，则终止
      //   indexOfLatestPlay.current = soundItems.findIndex(
      //     item => String(item.songId) === String(latestOne.songId),
      //   );
      //   console.log(
      //     `while内部获取indexOfLatestOne的值:${indexOfLatestPlay.current} 当前的pageNum:${pageNum.current}`,
      //   );
      // }
      // console.log(
      //   `方法执行完毕后，indexOfLatestPlay.current的值：${indexOfLatestPlay.current}`,
      // );
      // if (indexOfLatestPlay.current !== -1) {
      //   soundItems[indexOfLatestPlay.current].isLatestPlaied = true;
      //   console.log(
      //     `设置最近播放标识：${soundItems[indexOfLatestPlay.current]}`,
      //   );
      // }
      // setResults(soundItems);
    }
  };

  // 在组件加载时调用 fetchSongs
  useEffect(() => {
    // 切换sort方式，重置页码
    pageNum.current = 1;
    pageNumUp.current = 1;
    pageNumDown.current = 1;
    hasMoreDownData.current = true;
    hasMoreUpData.current = true;
    fetchSoundlist();
  }, [sort]);

  useEffect(() => {
    fecthPlayHistory();
  }, [results, refreshPage]);

  //console.log(`当前result所有信息：${JSON.stringify(results)}`);

  const handleBatchDownload = async () => {
    if (isEmpty(results)) {
      ToastUtil.showErrorToast('当前歌单为空~');
      return;
    }
    ToastUtil.showDefaultToast('准备添加声音到下载队列~');
    const validItems = results.filter(item => item.valid);

    if (isEmpty(validItems)) {
      ToastUtil.showErrorToast('没有可下载的声音~');
      return;
    }
    console.log(`准备遍历添加歌曲，总长度：${validItems.length}`);
    validItems.forEach(song => {
      useDownloadListStore.getState().addSong(song);
    });
    ToastUtil.showDefaultToast(`已添加${validItems.length}首歌曲到下载队列~`);
    downloadCore.startDownload();
  };

  const handleBatchPlay = async (songItem?: Song) => {
    // 例外情况，如果当前播放的歌曲就是想要播放的，直接跳转
    const currentSongItem = usePlaylistStore.getState().currentPlay?.songItem;
    console.log(`当前currentSongItem：${JSON.stringify(currentSongItem)}`);
    if (
      !isEmpty(currentSongItem) &&
      currentSongItem.platform === songItem?.platform &&
      currentSongItem.songId === songItem.songId
    ) {
      // 如果当前是暂停状态，则触发播放
      if (!usePlaylistStore.getState().currentPlay.isPlaying) {
        await playerCore.play();
      }
      navigation.navigate('正在播放');
      return;
    }

    const validItems = results.filter(item => item.valid);

    // const validItems = results;

    // ToastUtil.showDefaultToast('正在准备声音数据，请稍候~');
    if (isEmpty(validItems)) {
      ToastUtil.showErrorToast('没有可播放的声音~');
      return;
    }
    // let songItems = [];
    // let tempPageNum = 1;
    // while (true) {
    //   const response = await apiClient.post(
    //     `search/sounds/${platform}?pageNum=${tempPageNum}&pageSize=${pageSizeForBatch}&sort=${sort}`,
    //     { ...soundAlbumItem },
    //   );
    //   const pageSongResult = response.data?.result;
    //   if (isEmpty(pageSongResult)) {
    //     break;
    //   }
    //   songItems.push(...pageSongResult);
    //   tempPageNum++;
    //   ToastUtil.showDefaultToast(
    //     `正在准备声音数据，已拉取到${songItems.length}条数据~`,
    //   );
    // }
    // console.log(`准备遍历添加歌曲，总长度：${songItems.length}`);

    // const validItems = songItems.filter(item => item.valid);
    // if (isEmpty(validItems)) {
    //   ToastUtil.showErrorToast('没有可播放的歌曲');
    //   return;
    // }
    let targetIndex = 0;
    if (!isEmpty(validItems)) {
      targetIndex = validItems.findIndex(
        item =>
          item.platform === songItem?.platform &&
          item.songId === songItem?.songId,
      );
      ToastUtil.showDefaultToast(`即将播放：${songItem?.songTitle}`);
    } else {
      ToastUtil.showDefaultToast(`即将播放：${validItems[0].songTitle}`);
    }
    //console.log(`即将跳转播放，此时的position为${songItem.position}`);
    console.log(`即将跳转播放，此时的songItem为${JSON.stringify(songItem)}`);
    const songWithProgress = songItem as Song & {
      percentDesc?: string;
      position?: number;
    };
    playerCore.clearAndPlayTarget(
      validItems,
      targetIndex,
      isEmpty(songItem) || songWithProgress.percentDesc === '100%'
        ? 0
        : songWithProgress.position ?? 0,
    );
    navigation.navigate('正在播放');
    logUtil.info(`播放声音专辑：${albumTitle}`, 'SOUNDALBUM');
  };

  const hanleCacheSound = item => {
    console.log(`收到callBack的item:${JSON.stringify(item)}`);
    if (item.cacheStatus === 'WaitUpload') {
      cacheDetail.cachingSounds++;
    } else if (item.cacheStatus === 'Done') {
      cacheDetail.cachedSounds++;
    }
    setCacheDetail(cacheDetail);
  };

  const handleClickBookremark = async () => {
    const postBody = {
      platform: soundAlbumItem.platform,
      albumId: String(soundAlbumItem.albumId),
      albumImg: soundAlbumItem.albumImg,
      albumTitle: soundAlbumItem.albumTitle,
      countOfSounds: soundAlbumItem.countOfSounds,
      desc: soundAlbumItem.desc,
      vipType: soundAlbumItem.vipType,
      isFinished: soundAlbumItem.isFinished,
      soundAlbumUpdateAt: String(soundAlbumItem.soundAlbumUpdateAt),
      releaseDate: soundAlbumItem.releaseDate,
    };

    if (isBookmarked) {
      // 取消
      await apiClient.post('/soundalbum/un-bookmark', {
        ...postBody,
      });
      ToastUtil.showDefaultToast('已取消收藏');
      logUtil.info(`取消收藏声音专辑：${albumTitle}`, 'SOUNDALBUM');
    } else {
      const bookMarkCount = await MyUtils.getSoundBookmarkSuccess();
      const bookMarkLimit = await MyUtils.getSoundBookmarkLimt();
      if (bookMarkCount >= bookMarkLimit) {
        ToastUtil.showErrorToast(
          `资源所限，限额每天只能收藏${bookMarkLimit}张声音专辑~`,
        );
        return;
      }
      // 收藏
      await apiClient.post('/soundalbum/bookmark', {
        ...postBody,
      });
      await apiClient.post('/utils/user-action', {
        action: 'SOUND-ALBUM-BOOKMARK',
      });
      ToastUtil.showDefaultToast('已收藏，服务器会尽快为你拉取声音列表~');
      logUtil.info(`收藏声音专辑：${albumTitle}`, 'SOUNDALBUM');
      cacheDetail.cacheStatus = 'WaitUpload';
      setCacheDetail(cacheDetail);
    }
    setIsBookmarked(!isBookmarked);
  };

  const loadMoreData = useCallback(
    async direction => {
      console.log(`触发load事件，direction:${direction}`);
      if (direction === 'up' && !hasMoreUpData.current) {
        console.log('up方向没有更多数据了，不再触发...');
        return 0;
      }
      if (direction === 'down' && !hasMoreDownData.current) {
        console.log('down方向没有更多数据了，不再触发...');
        return;
      }
      let upIndexChange = 0;
      if (direction === 'up') {
        let newData = [];
        console.log(`此时pageNumUp的值:${pageNumUp.current}`);
        if (pageNumUp.current > 1) {
          pageNumUp.current--;
          pageNum.current = pageNumUp.current;
          newData = await fetchSongs();

          if (isEmpty(newData)) {
            console.log('up-newData为空，没有更多数据了');
            hasMoreUpData.current = false;
          } else {
            upIndexChange = newData.length;
          }
        }
        if (pageNumUp.current === 1) {
          console.log('2更新hasMoreUpData.current为false');
          // 已经没有数据了
          hasMoreUpData.current = false;
        }
        //console.log(`获取到新数据：${JSON.stringify(newData)}`);
        setResults(prevData => [...newData, ...prevData]);
      }
      if (direction === 'down') {
        pageNumDown.current++;
        pageNum.current = pageNumDown.current;
        const newData = await fetchSongs();
        if (isEmpty(newData)) {
          console.log(
            `down-newData为空，没有更多数据了，当前pageNumDown.current：${pageNumDown.current}`,
          );
          hasMoreDownData.current = false;
        }
        setResults(prevData => [...prevData, ...newData]);
      }
      console.log(`返回了${upIndexChange}`);
      return upIndexChange;
    },
    [fetchSongs],
  );

  const buildSoundListStatus = () => {
    let soundListStatus = '';
    if (cacheDetail?.cacheStatus === 'Not-Found') {
      soundListStatus = '尚未缓存';
    } else if (
      cacheDetail?.cacheStatus === 'WaitUpload' ||
      cacheDetail?.cacheStatus === 'Uploading'
    ) {
      soundListStatus = '缓存中';
    } else if (cacheDetail?.cacheStatus === 'Done') {
      soundListStatus = `已缓存 更新于 ${cacheDetail.cacheCheckDate}`;
    }

    return `列表数据：${soundListStatus}`;
  };

  const buildSoundUrlStatus = () => {
    let soundUrlStatus = '';
    if (cacheDetail?.cacheStatus === 'Done') {
      soundUrlStatus = `共${cacheDetail.countOfSounds}个，已缓存${cacheDetail.cachedSounds}个，缓存中${cacheDetail.cachingSounds}个`;
    } else {
      soundUrlStatus = '尚未缓存';
    }
    return `声音数据：${soundUrlStatus}`;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.playListName} numberOfLines={1}>
        {albumTitle}
      </Text>
      {/* 歌手图片 */}
      <Image
        source={MyUtils.buildPlayListImg(albumImg, type)}
        style={styles.playListImage}
      />
      <View>
        <Text style={styles.playListStatus} numberOfLines={1}>
          {buildSoundListStatus()}
        </Text>
        <Text style={styles.playListStatus} numberOfLines={1}>
          {buildSoundUrlStatus()}
        </Text>
        {cacheDetail?.cacheStatus === 'Done' && (
          <Text style={styles.playListStatus} numberOfLines={1}>
            点击声音就可以将它加入缓存队列~
          </Text>
        )}
      </View>
      <View style={styles.playListButtonView}>
        <TouchableOpacity
          onPress={() => {
            // 发生了变化
            sortChanged.current = true;
            setSort(sort === 'ASC' ? 'DESC' : 'ASC');
            hasMoreDownData.current = true;
            hasMoreUpData.current = true;
            setResults([]);
          }}
          style={styles.playListButton}>
          <Text style={styles.playListButtonText}>
            {sort === 'ASC' ? '正序' : '倒序'}
          </Text>
          <Icon
            name={sort === 'ASC' ? 'arrow-up-a-z' : 'arrow-up-z-a'}
            size={iconSizes.normal}
            color={colors.bgWhite}
            style={styles.playListButtonIcon}
          />
        </TouchableOpacity>

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
        renderScenario="sound"
        songItems={results}
        loadMoreData={loadMoreData}
        hasMoreDownData={hasMoreDownData.current}
        hasMoreUpData={hasMoreUpData.current}
        playSongs={handleBatchPlay}
        forceTriggerScrollTo={() => {
          console.log(`此时sortChanged.current的值：${sortChanged.current}`);
          return sortChanged.current;
        }}
        callBack={hanleCacheSound}
      />

      <Modal
        isVisible={noteModalVisible}
        style={{
          // justifyContent: 'flex-end', // 新页面从底部弹出
          // margin: 0, // 禁用默认的 margin
          margin: 0, // 禁用默认的 margin
          flex: 1, // 使用 flex 布局让模态框充满整个屏幕
          justifyContent: 'center', // 居中对齐
        }}
        animationType="fade"
        onRequestClose={() => setNoteModalVisible(false)}>
        <View style={styles1.modalOverlay}>
          <View style={styles1.modalContent}>
            <View
              style={{
                paddingVertical: 20,
                //backgroundColor: '#2196F3',
                alignItems: 'center',
                //flexDirection: 'row',
              }}>
              <Text
                style={{
                  fontSize: fontSizes.big,
                  color: '#000',

                  // position: 'absolute', // 绝对定位
                  // left: 0,
                  // right: 0,
                  // textAlign: 'center',
                  //left: '50%', // 水平偏移到容器中心
                  //transform: [{ translateX: -50 }], // 偏移自身宽度的一半，确保绝对居中
                }}>
                该声音专辑尚未缓存
              </Text>
            </View>

            <View style={{ flexDirection: 'column' }}>
              <Text
                style={{
                  fontSize: fontSizes.normal,
                  color: colors.fontColorDrakGray,
                  marginBottom: 10,
                }}>
                由于喜马拉雅的风控过于严厉，为降低被风控的频率，提升大家的使用体验，现对喜马拉雅资源的使用流程做出必要的优化。
              </Text>
              <Text
                style={{
                  fontSize: fontSizes.normal,
                  color: colors.fontColorRed,
                  marginBottom: 10,
                }}>
                {`如果你对该声音专辑感兴趣，请先收藏，收藏后服务器会尽快为你拉取声音列表（约20分钟内），目前限额每天最多收藏${bookMarkLimit.current}张声音专辑。`}
              </Text>
              <Text
                style={{
                  fontSize: fontSizes.normal,
                  color: colors.fontColorRed,
                  marginBottom: 10,
                }}>
                {`声音列表拉取完毕后，后台会自动开始缓存声音，你也可以点击某个声音申请将它加入缓存队列，缓存成功后才能播放，目前限额每天最多申请缓存${soundCacheLimit.current}个声音。`}
              </Text>
              {/* <View style={{ flexDirection: 'column', alignItems: 'center' }}>
                <Text
                  style={{
                    fontSize: fontSizes.normal,
                    color: colors.fontColorRed,

                    marginTop: 10,
                  }}>
                  防失联微信号：beyondbbk6
                </Text>
              </View> */}
            </View>

            {/* 选中指示器 */}
            {/* <View style={styles1.selectionIndicator} /> */}

            {/* 操作按钮 */}
            <View style={styles1.buttonRow}>
              <TouchableOpacity
                style={[styles1.button, styles1.confirmButton]}
                onPress={() => setNoteModalVisible(false)}>
                <Text style={styles1.buttonText}>我知道了</Text>
                <Icon
                  name="check"
                  size={iconSizes.normal}
                  color={colors.bgWhite}
                  style={{
                    marginLeft: 8,
                  }}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles1 = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  triggerButton: {
    padding: 15,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  triggerText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    width: '85%',
    //marginHorizontal: 20,
    borderRadius: 12,
    padding: 20,
  },

  numberText: {
    fontSize: fontSizes.veryBig,
    color: colors.fontColorLightGray,
  },

  levelText: {
    fontSize: fontSizes.normal,
    color: colors.fontColorLightGray,
  },

  activeNumberText: {
    fontSize: fontSizes.veryBig,
    color: colors.fontColorBlue,
  },

  activeLevelText: {
    fontSize: fontSizes.normal,
    color: colors.fontColorBlue,
  },

  // separator: {
  //   fontSize: fontSizes.normal,
  //   fontWeight: 'bold',
  //   marginHorizontal: 20,
  //   marginTop: ITEM_HEIGHT,
  //   //alignSelf: 'flex-end',
  //   //height: ITEM_HEIGHT,
  //   //lineHeight: ITEM_HEIGHT * 3,
  //   color: colors.fontColorDrakGray,
  // },
  // selectionIndicator: {
  //   position: 'absolute',
  //   top: '50%',
  //   height: ITEM_HEIGHT,
  //   width: '100%',
  //   backgroundColor: 'rgba(200,200,200,0.2)',
  //   borderTopWidth: 1,
  //   borderBottomWidth: 1,
  //   borderColor: '#007AFF',
  //   transform: [{ translateY: -ITEM_HEIGHT / 2 }],
  // },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 15,
  },
  button: {
    paddingVertical: featureButtonNormal.paddingVertical,
    paddingHorizontal: featureButtonNormal.paddingHorizontal,
    borderRadius: featureButtonNormal.borderRadius,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: colors.fontColorVeryLightGray,
  },
  confirmButton: {
    backgroundColor: colors.fontColorBlue,
  },
  buttonText: {
    color: colors.fontColorWhite,
    fontSize: fontSizes.small,
  },
});

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
  playListStatus: {
    fontSize: fontSizes.small,
    //fontWeight: 'bold',
    color: colors.fontColorDrakGray,
    textAlign: 'center',
    marginBottom: 10,
  },
  playListButtonView: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  playListButton: {
    paddingVertical: featureButtonNormal.paddingVertical,
    paddingHorizontal: featureButtonNormal.paddingHorizontal,
    marginHorizontal: 10,

    borderRadius: featureButtonNormal.borderRadius,
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

export default SoundAlbumDetails;
