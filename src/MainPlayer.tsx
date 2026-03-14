import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Animated,
  Easing,
  Button,
  ScrollView,
  Dimensions,
} from 'react-native';

import Slider from '@react-native-community/slider';
import Icon from 'react-native-vector-icons/FontAwesome6';
import ToastUtil from './utils/ToastUtil';
import { BlurView } from '@react-native-community/blur';
import Modal from 'react-native-modal';
import { isEmpty, isUndefined } from 'lodash';
import playerCore from './playerCore';

import TrackPlayer, {
  State,
  useTrackPlayerEvents,
  Event,
  useProgress,
  usePlaybackState,
} from 'react-native-track-player';
import MyUtils from './utils/MyUtils';
import usePlaylistStore from './global/usePlaylistStore';
import { PlayMode } from './enums/PlayMode';
import apiClient from './utils/ApiClient';
import SongList from './SongList';
import Toast from 'react-native-root-toast';
import {
  colors,
  featureButtonNormal,
  fontSizes,
  iconSizes,
} from './Common.styles';
import { Colors } from 'react-native/Libraries/NewAppScreen';
import { ParameterConstant } from './ParameterConstant';
import logUtil from './utils/LogUtil';
import useDownloadListStore from './global/useDownloadListStore';
import downloadCore from './downloadCore';
import dayjs from 'dayjs';

type RenderType =
  | 'min'
  | 'hour'
  | 'rate'
  | 'qqLevel'
  | 'wyyLevel'
  | 'skipStart'
  | 'skipEnd';
const ITEM_HEIGHT = 40;
const VISIBLE_ITEMS = 4;

const MainPlayer = () => {
  const currentPlay = usePlaylistStore(state => state.currentPlay);
  const loading = usePlaylistStore(state => state.loading());
  const progress = useProgress();
  const [heart, setHeart] = useState(false);
  const [showLrc, setShowLrc] = useState(false);
  const [clockModalVisible, setClockModalVisible] = useState(false);
  const [activeMin, setActiveMin] = useState(0);
  const [activeHour, setActiveHour] = useState(0);
  const qqLevel = usePlaylistStore(state => state.currentPlay.qqConfigLevel);
  const wyyLevel = usePlaylistStore(state => state.currentPlay.wyyConfigLevel);
  const [activeQQLevelIndex, setActiveQQLevelIndex] = useState(
    qqLevel === undefined ? 0 : qqLevel,
  );
  const [activeWyyLevelIndex, setActiveWyyLevelIndex] = useState(
    wyyLevel === undefined ? 0 : wyyLevel,
  );
  const planStopAt = usePlaylistStore(state => state.currentPlay.planStopAt);
  const playRate = usePlaylistStore(state => state.currentPlay.playRate);
  const [hifiLimit, setHifiLimit] = useState(0);
  const [hifiPlaied, setHifiPlaied] = useState(0);
  const [clockEnabled, setClockEnabled] = useState(planStopAt !== undefined);
  //console.log(`获取到当前的playRate:${playRate}`);
  const [rateModalVisible, setRateModalVisible] = useState(false);
  const [hifiModalVisible, setHifiModalVisible] = useState(false);
  const [hifiEnabled, setHifiEnabled] = useState(
    (qqLevel !== undefined && qqLevel !== 0) ||
      (wyyLevel !== undefined && wyyLevel !== 0),
  );

  const [rateEnabled, setRateEnabled] = useState(
    playRate !== undefined && playRate !== 1,
  );

  const [activeRateIndex, setActiveRateIndex] = useState(0);
  // 获取跳过列表
  const skipList = usePlaylistStore(state => state.skipStartEndList);

  const hourScrollRef = useRef(null);
  const minuteScrollRef = useRef(null);
  const rateScrollRef = useRef(null);
  const qqLevelRef = useRef(null);
  const wyyLevelRef = useRef(null);
  // 生成数字数组
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 12 }, (_, i) => i * 5);
  const rates = Array.from({ length: 9 }, (_, i) => 1 + i * 0.25);
  const skipStartSeconds = Array.from({ length: 121 }, (_, i) => i);
  const skipEndSeconds = Array.from({ length: 121 }, (_, i) => i);
  // const isCurrentSoundInSkipList = useCallback(() => {
  //   if (
  //     currentPlay.songItem?.songType !== 'sound' ||
  //     isEmpty(skipList) ||
  //     skipList === undefined
  //   ) {
  //     return false;
  //   }
  //   //console.log(`skipList:${JSON.stringify(skipList)}`);
  //   return skipList.findIndex(
  //     existItem =>
  //       existItem.platform === currentPlay.songItem?.platform &&
  //       existItem.soundAlbumId === currentPlay.songItem?.soundAlbumId,
  //   );
  // }, [currentPlay, skipList]);

  const [skipModalVisible, setSkipModalVisible] = useState(false);
  const [skipModalReady, setSkipModalReady] = useState(false);

  useEffect(() => {
    if (skipModalVisible) {
      setTimeout(() => setSkipModalReady(true), 10); // 微小延迟
    } else {
      setSkipModalReady(false);
    }
  }, [skipModalVisible]);
  const skipStartScrollRef = useRef(null);
  const skipEndScrollRef = useRef(null);
  const getSkipStart = () => {
    if (
      currentPlay.songItem?.songType !== 'sound' ||
      isEmpty(skipList) ||
      skipList === undefined
    ) {
      return 0;
    }
    const existItem = skipList.find(
      existItem =>
        existItem.platform === currentPlay.songItem?.platform &&
        existItem.soundAlbumId === currentPlay.songItem?.soundAlbumId,
    );
    if (!isEmpty(existItem)) {
      //console.log(`找到的exitsItem:${JSON.stringify(existItem)}`);
      return existItem.skipStart;
    }
    return 0;
  };

  const getSkipEnd = () => {
    if (
      currentPlay.songItem?.songType !== 'sound' ||
      isEmpty(skipList) ||
      skipList === undefined
    ) {
      return 0;
    }
    const existItem = skipList.find(
      existItem =>
        existItem.platform === currentPlay.songItem?.platform &&
        existItem.soundAlbumId === currentPlay.songItem?.soundAlbumId,
    );
    if (!isEmpty(existItem)) {
      return existItem.skipEnd;
    }
    return 0;
  };
  const skipStart = getSkipStart();
  const skipEnd = getSkipEnd();
  const [skipEnabled, setSkipEnabled] = useState(false);
  const [activeSkipStart, setActiveSkipStart] = useState(
    skipStart === undefined ? 0 : skipStart,
  );
  const [activeSkipEnd, setActiveSkipEnd] = useState(
    skipEnd === undefined ? 0 : skipEnd,
  );
  // console.log(
  //   `此时获取的skip相关的值，skipStart：${skipStart} skipEnd:${skipEnd} activeSkipStart:${activeSkipStart} activeSkipEnd:${activeSkipEnd}`,
  // );

  useEffect(() => {
    setSkipEnabled(skipStart !== 0 || skipEnd !== 0);
    setActiveSkipStart(skipStart);
    setActiveSkipEnd(skipEnd);
  }, [skipStart, skipEnd]);

  const [refreshPage, setRefreshPage] = useState<any>();
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

  useEffect(() => {
    // console.log(
    //   `收到播放回调，planStopAt：${JSON.stringify(
    //     planStopAt,
    //   )} new Date():${JSON.stringify(new Date())} 比较结果：${dayjs(
    //     new Date(),
    //   ).isAfter(dayjs(planStopAt))}`,
    // );
    if (!clockEnabled) {
      //console.log('当前定时任务已经关闭了，无需触发~');
      return;
    }
    if (dayjs(new Date()).isAfter(dayjs(planStopAt))) {
      console.log('定时播放需要停止了~');
      playerCore.pause();
      usePlaylistStore.getState().updateCurrentPlay({ planStopAt: undefined });
      setClockEnabled(false);
      ToastUtil.showDefaultToast('已到预设的关闭时间，已暂停~');
      setActiveHour(0);
      setActiveMin(0);
      logUtil.info('执行定时关闭播放成功~');
    }
  });

  useEffect(() => {
    const fetchHifiLimit = async () => {
      const hifiLimit = await playerCore.hifiLimt();
      console.log(`获取到hifi limit:${hifiLimit}`);
      setHifiLimit(hifiLimit);
    };
    fetchHifiLimit();
    const fetchHifiPlaied = async () => {
      const hifiPlaied = await playerCore.hifiPlaied();
      console.log(`获取到hifi plaied:${hifiPlaied}`);
      setHifiPlaied(hifiPlaied);
    };
    fetchHifiPlaied();
  }, [hifiModalVisible]);

  const renderNumbers = (numbers, renderType: RenderType) => {
    return numbers.map((num, index) => (
      <View key={index} style={styles1.numberContainer}>
        {renderType === 'min' && (
          <Text
            style={
              index === activeMin
                ? styles1.activeNumberText
                : styles1.numberText
            }>
            {num.toString().padStart(2, '0')}
          </Text>
        )}
        {renderType === 'hour' && (
          <Text
            style={
              index === activeHour
                ? styles1.activeNumberText
                : styles1.numberText
            }>
            {num.toString().padStart(2, '0')}
          </Text>
        )}

        {renderType === 'rate' && (
          <Text
            style={
              index === activeRateIndex
                ? styles1.activeNumberText
                : styles1.numberText
            }>
            {num.toFixed(2)}
          </Text>
        )}
        {renderType === 'qqLevel' && (
          <Text
            style={
              index === activeQQLevelIndex
                ? styles1.activeLevelText
                : styles1.levelText
            }>
            {num}
          </Text>
        )}
        {renderType === 'wyyLevel' && (
          <Text
            style={
              index === activeWyyLevelIndex
                ? styles1.activeLevelText
                : styles1.levelText
            }>
            {num}
          </Text>
        )}
        {renderType === 'skipStart' && (
          <Text
            style={
              index === activeSkipStart
                ? styles1.activeNumberText
                : styles1.numberText
            }>
            {num.toString().padStart(2, '0')}
          </Text>
        )}
        {renderType === 'skipEnd' && (
          <Text
            style={
              index === activeSkipEnd
                ? styles1.activeNumberText
                : styles1.numberText
            }>
            {num.toString().padStart(2, '0')}
          </Text>
        )}
      </View>
    ));
  };

  const buildClockTimeDesc = () => {
    console.log('Selected time:', `${activeHour}:${activeMin}`);
    let finalDesc = '';
    if (activeHour !== 0) {
      finalDesc += `${activeHour}小时`;
    }
    if (activeMin !== 0) {
      finalDesc += `${5 * activeMin}分钟`;
    }
    return finalDesc;
  };

  const buildMusicLevelDesc = () => {
    if (currentPlay.songItem?.platform === 'QQ') {
      const qqFinalLevel = usePlaylistStore.getState().currentPlay.qqFinalLevel;
      return MyUtils.getQQLevelDescs()[
        qqFinalLevel === undefined ? 0 : qqFinalLevel
      ];
    } else if (currentPlay.songItem?.platform === 'WYY') {
      const wyyFinalLevel =
        usePlaylistStore.getState().currentPlay.wyyFinalLevel;
      return MyUtils.getWyyLevelDescs()[
        wyyFinalLevel === undefined ? 0 : wyyFinalLevel
      ];
    } else {
      return '默认';
    }
  };

  const buildLeftClockTimeDesc = () => {
    const minutes = dayjs(planStopAt).diff(dayjs(new Date()), 'minute');
    console.log(`预计停止播放时间和现在间隔${minutes}分钟`);
    const hours = Math.floor(minutes / 60); // 获取小时数
    const remainingMinutes = minutes % 60; // 获取剩余的分钟数

    if (hours > 0 && remainingMinutes > 0) {
      // 如果既有小时又有分钟
      return `将于${hours}小时${remainingMinutes}分钟后停止播放~`;
    } else if (hours > 0) {
      // 如果只有小时
      return `将于${hours}小时后停止播放~`;
    } else if (remainingMinutes > 0) {
      // 如果只有分钟
      return `将于${remainingMinutes}分钟后停止播放~`;
    } else {
      // 如果没有小时和分钟
      return '即将停止播放~';
    }
  };

  const handleConfirmHifi = async () => {
    setHifiModalVisible(false);
    // if (activeQQLevelIndex === 0 && activeWyyLevelIndex === 0) {
    //   console.log('没有设置高品质音源~');
    //   return;
    // }
    console.log(`activeQQLevelIndex=${activeQQLevelIndex}`);
    const currentQQLevelIndex =
      usePlaylistStore.getState().currentPlay.qqConfigLevel;
    const currentWyyLevelIndex =
      usePlaylistStore.getState().currentPlay.wyyConfigLevel;
    if (
      currentQQLevelIndex === activeQQLevelIndex &&
      currentWyyLevelIndex === activeWyyLevelIndex
    ) {
      console.log('音质选项没有任何变化，本次不需要做什么~');
      return;
    }
    // setHifiEnabled(true);
    // 是否点亮高品质音乐图标？
    if (activeQQLevelIndex > 0 || activeWyyLevelIndex > 0) {
      console.log(
        `activeQQLevelIndex:${activeQQLevelIndex} activeWyyLevelIndex:${activeWyyLevelIndex} 当前设置需要点亮高品质图标~`,
      );
      logUtil.info(
        `用户开启了高品质音乐，QQ：${
          MyUtils.getQQLevelDescs()[activeQQLevelIndex]
        } 网易云：${MyUtils.getWyyLevelDescs()[activeWyyLevelIndex]}`,
        'PLAY',
      );
      setHifiEnabled(true);
    }
    if (activeQQLevelIndex === 0 && activeWyyLevelIndex === 0) {
      console.log(
        `activeQQLevelIndex:${activeQQLevelIndex} activeWyyLevelIndex:${activeWyyLevelIndex} 当前设置需要关闭高品质图标~`,
      );
      setHifiEnabled(false);
    }

    usePlaylistStore.getState().updateCurrentPlay({
      qqConfigLevel: activeQQLevelIndex,
      wyyConfigLevel: activeWyyLevelIndex,
    });
    if (currentPlay.isPlaying) {
      // 是否触发重新播放，要看当前音乐来源和变化的来源
      const platform = currentPlay.songItem?.platform;
      if (platform === 'QQ' && activeQQLevelIndex !== currentQQLevelIndex) {
        console.log('QQ音源发生了变化，需要重新触发~');
        ToastUtil.showDefaultToast('QQ音源设置成功，尝试切换音源~');
        await playerCore.pause();
        await playerCore.switchMusicLevel(getPosition());
      } else if (
        platform === 'WYY' &&
        activeWyyLevelIndex !== currentWyyLevelIndex
      ) {
        console.log('WYY音源发生了变化，需要重新触发~');
        ToastUtil.showDefaultToast('网易云音源设置成功，尝试切换音源~');
        await playerCore.pause();
        await playerCore.switchMusicLevel(getPosition());
      } else {
        ToastUtil.showDefaultToast('设置成功，下次播放音乐时生效~');
      }
    } else {
      ToastUtil.showDefaultToast('设置成功，下次播放音乐时生效~');
    }
  };

  const handleConfirmSkip = async () => {
    console.log(`当前播放的声音信息：${JSON.stringify(currentPlay.songItem)}`);
    setSkipModalVisible(false);
    // console.log(`activeQQLevelIndex=${activeQQLevelIndex}`);
    // const currentQQLevelIndex =
    //   usePlaylistStore.getState().currentPlay.qqConfigLevel;
    // const currentWyyLevelIndex =
    //   usePlaylistStore.getState().currentPlay.wyyConfigLevel;
    if (activeSkipStart === skipStart && activeSkipEnd === skipEnd) {
      console.log('跳过片头片尾没有任何变化，本次不需要做什么~');
      return;
    }
    // setHifiEnabled(true);
    // 是否点亮高品质音乐图标？
    if (activeSkipStart > 0 || activeSkipEnd > 0) {
      console.log('用户设置了片头片尾~');
      logUtil.info(
        `用户设置了跳过片头：${activeSkipStart} 跳过片尾：${activeSkipEnd}`,
        'PLAY',
      );
      setSkipEnabled(true);
    }
    if (activeSkipStart === 0 && activeSkipEnd === 0) {
      console.log('用户设置片头片尾为0，其实本质上是取消了~');
      setSkipEnabled(false);
    }

    usePlaylistStore.getState().updateSkipStartEndList({
      platform: currentPlay.songItem?.platform,
      soundAlbumId: currentPlay.songItem?.soundAlbumId,
      skipStart: activeSkipStart,
      skipEnd: activeSkipEnd,
    });
    // if (currentPlay.isPlaying) {
    //   // 看一下是否要跳过片头
    // } else {
    //   //ToastUtil.showDefaultToast('设置成功，下次播放有声书时生效~');
    // }
    ToastUtil.showDefaultToast('设置成功，配置已生效~');
  };

  const handleConfirmClock = () => {
    setClockModalVisible(false);
    if (activeHour === 0 && activeMin === 0) {
      console.log('没有设置停止时间~');
      return;
    }
    setClockEnabled(true);
    const planStopDate = dayjs(new Date())
      .add(activeHour, 'hour')
      .add(activeMin * 5, 'minute');
    console.log(`目标关闭时间：${JSON.stringify(planStopDate)}`);
    usePlaylistStore
      .getState()
      .updateCurrentPlay({ planStopAt: planStopDate.toDate() });
    // 这里可以添加确认后的处理逻辑
    ToastUtil.showDefaultToast(`${buildClockTimeDesc()}后停止播放~`);
    logUtil.info(`用户设置${buildClockTimeDesc()}后停止播放~`, 'PLAY');
  };

  const handleConfirmRate = () => {
    setRateModalVisible(false);
    if (activeRateIndex === 0) {
      console.log('没有设置播放速度~');
      return;
    }
    setRateEnabled(true);

    console.log(`目标播放速度：${JSON.stringify(rates[activeRateIndex])}`);
    // usePlaylistStore
    //   .getState()
    //   .updateCurrentPlay({ playRate: rates[activeRateIndex] });
    playerCore.setPlayRate(rates[activeRateIndex]);
    // 这里可以添加确认后的处理逻辑
    ToastUtil.showDefaultToast(`播放速度设置为${rates[activeRateIndex]}~`);
    logUtil.info(
      `用户设置播放速度为${rates[activeRateIndex].toFixed(2)}`,
      'PLAY',
    );
  };

  const toggleClockEnable = () => {
    if (clockEnabled) {
      ToastUtil.showDefaultToast('已取消定时播放~');
      setClockEnabled(false);
      setActiveHour(0);
      setActiveMin(0);
      usePlaylistStore.getState().updateCurrentPlay({ planStopAt: undefined });
      logUtil.info('用户取消了定时播放~');
    } else {
      // if (!usePlaylistStore.getState().currentPlay.isPlaying) {
      //   console.log(`当前未播放音乐~`);
      //   ToastUtil.showDefaultToast(`当前未播放音乐，无需设置定时关闭~`);
      //   return;
      // }
      setClockModalVisible(true);
    }
  };

  const prevShowLrc = useRef(showLrc);
  useEffect(() => {
    if (prevShowLrc.current && !showLrc && currentPlay.isPlaying) {
      // 用户从歌词界面切换回来了，需要触发动画
      startRotation();
    }

    if (!prevShowLrc.current && showLrc) {
      // 用户从专辑界面切换到歌词界面
      scrollLrc();
    }
    // 更新 prevState 为当前的 state
    prevShowLrc.current = showLrc;
  }, [showLrc]);
  // const [download, setDownload] = useState(false);
  const downloadList = useDownloadListStore(state => state.downLoadList);

  const [isModalVisible, setModalVisible] = useState(false);

  const getPosition = () => {
    // console.log(
    //   `触发getPosition， sliderMoveToValue.current:${sliderMoveToValue.current}`,
    // );
    if (sliderMoveToValue.current !== -1) {
      return sliderMoveToValue.current;
      //sliderMoveToValue.current = -1;
      // console.log(`触发getPosition， 返回值:${result}`);
    }
    if (currentPlay.isPlaying === false || loading || progress.position === 0) {
      return currentPlay.playPosition;
    }
    return progress.position;
  };

  const getDuration = () => {
    if (currentPlay.isPlaying === false || loading || progress.duration === 0) {
      return currentPlay.playDuration;
    }
    return progress.duration;
  };

  // 播放/暂停功能
  const togglePlayPause = async () => {
    if (currentPlay.isPlaying) {
      // 暂停
      await playerCore.pause();
    } else {
      // 播放
      await playerCore.play();
    }
  };

  const getDownloadColor = () => {
    if (isEmpty(currentPlay) || isEmpty(downloadList)) {
      return colors.fontColorLightGray;
    }
    const existItem = downloadList.find(
      item =>
        item.platform === currentPlay.songItem?.platform &&
        item.songId === currentPlay.songItem.songId,
    );
    if (isEmpty(existItem)) {
      return colors.fontColorLightGray;
    }
    if (existItem.downloadStatus === 'Success') {
      return colors.fontColorGreen;
    } else if (existItem.downloadStatus === 'Failed') {
      return colors.fontColorRed;
    } else {
      return colors.fontColorBlue;
    }
  };
  const spinValue = useRef(new Animated.Value(0)).current;
  const currentRotation = useRef(0);
  // 控制唱片旋转动画
  const startRotation = () => {
    spinValue.setValue(currentRotation.current);
    Animated.timing(spinValue, {
      toValue: currentRotation.current + 360,
      duration: 20000, // 转一圈需要10秒
      easing: Easing.linear,
      useNativeDriver: true,
    }).start(item => {
      currentRotation.current += 360;
      if (currentPlay.isPlaying && item.finished) {
        startRotation(); // 循环旋转
      }
    });
  };

  const stopRotation = () => {
    spinValue.stopAnimation(currentValue => {
      currentRotation.current = currentValue % 360;
    });
  };

  useEffect(() => {
    if (currentPlay.isPlaying) {
      startRotation();
    } else {
      stopRotation();
    }
  }, [currentPlay.isPlaying]);

  const spin = spinValue.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '360deg'], // 从0度转到360度
  });

  const getPlayModeIconName = () => {
    switch (currentPlay.playMode) {
      case PlayMode.Order:
        return 'arrow-down-a-z';
      case PlayMode.Random:
        return 'shuffle';
      case PlayMode.Single:
        return 'repeat';
      default:
        return 'arrow-down-a-z';
    }
  };

  const toggleModal = () => {
    if (isModalVisible) {
      console.log('清理songItems数据...');
      //setSongItems(songItemsData);
      startIndex.current = undefined;
      endIndex.current = undefined;
      hasMoreDownData.current = true;
      hasMoreUpData.current = true;
    }
    setModalVisible(!isModalVisible);
  };

  const toggleHeart = async () => {
    // 当前有无音乐，无音乐什么都不做
    if (isEmpty(currentPlay.songItem)) {
      ToastUtil.showDefaultToast('当前没有歌曲');
      return;
    }
    const songItem = currentPlay.songItem;

    // 如果是声音，则不允许红心
    if (songItem.songType === 'sound') {
      //console.log('拦截了toggleHeart');
      ToastUtil.showErrorToast('有声书资源无法标记红心，抱歉~');
      return;
    }
    //console.log('执行了toggleHeart');
    if (heart) {
      //取消
      await apiClient.post('/playlist/remove-song', {
        removePlatform: songItem.platform,
        removeSongRefId: songItem.songId.toString(),
        removeFromFavorite: true,
      });
      ToastUtil.showDefaultToast('已取消红心');
      logUtil.info(`取消红心：${songItem.songTitle}`, 'PLAY');
    } else {
      //添加
      await apiClient.post('/playlist/add-song', {
        //playListId: selectedPlaylistId,
        platform: songItem.platform,
        songId: songItem.songId.toString(),
        songTitle: songItem.songTitle,
        songImg: songItem.songImg,
        singerName: songItem.singerName,
        albumId: songItem.albumId.toString(),
        albumTitle: songItem.albumTitle,
        rawDetail: songItem,
        addToFavorite: true,
        songType: songItem.songType,
        valid: songItem.valid,
      }); // 替换为真实的 API 地址
      ToastUtil.showDefaultToast('已标记红心');
      logUtil.info(`标记红心：${songItem.songTitle}`, 'PLAY');
    }
    setHeart(!heart);
  };
  // 播放页面一页的歌曲数量，尽可能大一些，但太大会影响性能
  const initalPageSize = 30;
  const playQueuePageSize = 15;
  //let allPlayQueueData = usePlaylistStore.getState().playList;
  const allPlayQueueData = usePlaylistStore(state => state.playList);
  // console.log(
  //   `触发MainPlayer，allPlayQueueData length:${allPlayQueueData.length}`,
  // );
  //const playIndex = usePlaylistStore.getState().currentPlay.playIndex;
  const playIndex = usePlaylistStore(state => state.currentPlay.playIndex);
  // const [data, setData] = useState([]);
  // console.log(
  //   `Math.min(playIndex + initalPageSize / 2, allPlayQueueData.length - 1):${Math.min(
  //     playIndex + initalPageSize / 2,
  //     allPlayQueueData.length - 1,
  //   )}`,
  // );
  // console.log(
  //   `Math.max(playIndex - initalPageSize / 2, 0):${Math.max(
  //     playIndex - initalPageSize / 2,
  //     0,
  //   )}`,
  // );
  const startIndex = useRef(undefined);
  const endIndex = useRef(undefined);
  if (startIndex.current === undefined || !isModalVisible) {
    startIndex.current = Math.max(playIndex - initalPageSize / 2, 0);
  }
  if (endIndex.current === undefined || !isModalVisible) {
    endIndex.current = Math.min(
      playIndex + initalPageSize / 2,
      allPlayQueueData.length,
    );
  }

  // 将playIndex列入依赖项，当playIndex变化的时候，强制重新渲染
  const songItemsData = useMemo(() => {
    console.log(
      `更新songItemsData数据，startIndex.current：${startIndex.current} endIndex.current:${endIndex.current} playIndex:${playIndex}`,
    );
    return allPlayQueueData.slice(startIndex.current, endIndex.current);
  }, [
    allPlayQueueData,
    startIndex.current,
    endIndex.current,
    playIndex,
    isModalVisible,
  ]);
  // console.log(
  //   `startIndex.current的值：${startIndex.current} endIndex.current的值:${endIndex.current} 最终songItemsData.length:${songItemsData.length}`,
  // );
  //console.log(`length:${initFlatListData.length}`);
  //const [songItems, setSongItems] = useState(songItemsData);

  const [isLoading, setIsLoading] = useState(false);
  const hasMoreDownData = useRef(true);
  const hasMoreUpData = useRef(true);

  const setModalClosed = useCallback(() => {
    setModalVisible(false);
  }, []);

  // 加载更多数据逻辑
  const loadMoreData = useCallback(
    direction => {
      let upIndexChange = 0;
      if (!isModalVisible) {
        console.log('忽略加载...');
        return;
      }
      // if (isLoading) {
      //   return;
      // }
      if (direction === 'up' && !hasMoreUpData.current) {
        //ToastUtil.showDefaultToast('没有更多数据了...');
        return;
      }
      if (direction === 'down' && !hasMoreDownData.current) {
        console.log('down方向没有更多数据了');
        //ToastUtil.showDefaultToast('没有更多数据了...');
        return;
      }

      //setIsLoading(true);
      //allPlayQueueData = usePlaylistStore.getState().playList;
      //ToastUtil.showDefaultToast('加载中...');
      if (direction === 'up') {
        if (startIndex.current === 0) {
          //ToastUtil.showDefaultToast('没有更多数据了...');
          hasMoreUpData.current = false;
        } else {
          const beforeStartIndex = startIndex.current;
          // 向上加载：在头部插入数据
          startIndex.current = Math.max(
            0,
            startIndex.current - playQueuePageSize,
          ); // 当前头部数据的索引

          upIndexChange = beforeStartIndex - startIndex.current;
          console.log(
            `startIndex:${startIndex.current} upIndexChange:${upIndexChange}`,
          );
        }
      } else if (direction === 'down') {
        const playListLength = usePlaylistStore.getState().playList.length;
        // 向下加载：在尾部追加数据
        if (endIndex.current === playListLength) {
          //ToastUtil.showDefaultToast('没有更多数据了...');
          hasMoreDownData.current = false;
        } else {
          endIndex.current = Math.min(
            playListLength,
            endIndex.current + playQueuePageSize,
          );
        }
        // const endIndex =
        //   allPlayQueueData.indexOf(songItems[songItems.length - 1]) + 1; // 当前尾部数据的索引
      }
      // if (
      //   (direction === 'up' && !hasMoreUpData.current) ||
      //   (direction === 'down' && !hasMoreDownData.current)
      // ) {
      //   ToastUtil.showDefaultToast('没有更多数据了...');
      // } else {
      //   ToastUtil.showDefaultToast('加载完成');
      // }

      setIsLoading(!isLoading);
      return upIndexChange;
      // return {
      //   upIndexChange: upIndexChange,
      //   hasMoreUpData: hasMoreUpData.current,
      //   hasMoreDownData: hasMoreDownData.current,
      // };
    },
    [
      isModalVisible, // 依赖项
      hasMoreUpData,
      hasMoreDownData,
      startIndex,
      endIndex,
      playQueuePageSize,
      isLoading,
    ],
  );

  useEffect(() => {
    const checkHeart = async () => {
      const heartCheckResult = await apiClient.get(
        `/playlist/check-heart/${currentPlay.songItem?.platform}/${currentPlay.songItem?.songId}`,
      );
      console.log(
        `红心音乐检查结果:${JSON.stringify(heartCheckResult.data)} 检查歌曲：${
          currentPlay.songItem?.songTitle
        } songId:${currentPlay.songItem?.songId}`,
      );
      setHeart(heartCheckResult.data.result);
    };
    checkHeart();
  }, [currentPlay.songItem, isModalVisible]);

  const sliderMoveToValue = useRef(-1);
  const handleSliderValueChange = async value => {
    sliderMoveToValue.current = value;
  };

  const timerIdRef = useRef(null); // 使用 useRef 来存储 timerId
  const handleSilderMoveComplete = async value => {
    await TrackPlayer.seekTo(value);
    if (timerIdRef.current) {
      clearTimeout(timerIdRef.current);
    }
    timerIdRef.current = setTimeout(() => {
      sliderMoveToValue.current = -1;
    }, 1000);
  };

  const [containerWidth, setContainerWidth] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);

  // 获取父容器的宽度和高度
  const onLayout = event => {
    const { width, height } = event.nativeEvent.layout;
    setContainerWidth(width);
    setContainerHeight(height);
  };

  // 计算最小值的 80%
  const size = Math.min(containerWidth, containerHeight);

  const handleLyric = () => {
    const rawLyric = currentPlay.songItem?.songLyric;
    if (isEmpty(rawLyric)) {
      return [];
    }
    const lines = rawLyric.split('\n'); // 按行分割
    const result: { time: number; text: string; anim: Animated.Value }[] = [];

    lines.forEach(line => {
      const regex = /^\[(\d{2}):(\d{2}\.\d{1,3})\](.*)$/; // 匹配时间戳和歌词文本
      const match = line.match(regex);

      if (match) {
        const minutes = parseInt(match[1]);
        const seconds = parseFloat(match[2]);
        const text = match[3].trim();

        // 将时间戳转换为秒
        const timeInSeconds = minutes * 60 + seconds;
        if (!isEmpty(text)) {
          // 生成符合JSON格式的对象
          result.push({
            time: timeInSeconds,
            text,
            anim: new Animated.Value(0),
          });
        }
      }
    });
    if (isEmpty(result)) {
      result.push({
        time: 0,
        text: '抱歉，该歌曲暂无歌词信息~',
        anim: new Animated.Value(0),
      });
    }
    return result;
  };
  const lyrics = handleLyric();
  const progressAnim = useRef(new Animated.Value(0)).current;
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    const seconds = getPosition() as number;
    setCurrentTime(seconds);
    progressAnim.setValue(seconds);
  }, [progress.position]);

  // 获取当前播放的歌词索引
  const getCurrentLyricIndex = () => {
    for (let i = lyrics.length - 1; i >= 0; i--) {
      if (currentTime + 0.5 >= lyrics[i].time) {
        return i;
      }
    }
    return -1;
  };

  const currentIndex = getCurrentLyricIndex();
  const scrollViewRef = useRef<ScrollView>(null);
  const [scrollViewHeight, setScrollViewHeight] = useState(0);
  const [itemHeight, setItemHeight] = useState(0); // 动态计算歌词高度
  const scrollLrc = () => {
    if (scrollViewRef.current && currentIndex !== -1 && scrollViewHeight > 0) {
      const scrollToY =
        (currentIndex + 1) * (itemHeight + 10) +
        itemHeight -
        scrollViewHeight / 2;
      // console.log(
      //   `scrollToY:${scrollToY} currentIndex:${currentIndex} itemHeight:${itemHeight} scrollViewHeight:${scrollViewHeight}`,
      // );
      scrollViewRef.current.scrollTo({
        y: Math.max(scrollToY, 0), // 防止滚动超出顶部
        animated: true,
      });
    }
  };
  // 自动滚动当前歌词到 **居中**
  useEffect(() => {
    scrollLrc();
  }, [currentIndex, scrollViewHeight, itemHeight]);

  const handleShowLrc = () => {
    if (currentPlay.songItem?.songType === 'sound') {
      ToastUtil.showErrorToast('抱歉，有声书资源暂时无歌词~');
      return;
    }
    ToastUtil.showDefaultToast(showLrc ? '关闭歌词' : '打开歌词');
    setShowLrc(!showLrc);
    logUtil.info(`用户点击歌词按钮，当前状态：${showLrc}`);
  };

  // 处理滚动事件
  const handleScroll = (event, renderType: RenderType) => {
    console.log(`清除endDragTimer定时器：${endDragTimer.current}`);
    clearTimeout(endDragTimer.current);
    // 获取滚动位置（垂直方向）
    const offsetY = event.nativeEvent.contentOffset.y;
    if (renderType === 'min') {
      setActiveMin(Math.round(offsetY / ITEM_HEIGHT));
    }
    if (renderType === 'hour') {
      setActiveHour(Math.round(offsetY / ITEM_HEIGHT));
    }
    if (renderType === 'rate') {
      setActiveRateIndex(Math.round(offsetY / ITEM_HEIGHT));
    }
    if (renderType === 'qqLevel') {
      console.log(`设置qqIndex=${Math.round(offsetY / ITEM_HEIGHT)}`);
      setActiveQQLevelIndex(Math.round(offsetY / ITEM_HEIGHT));
    }
    if (renderType === 'wyyLevel') {
      console.log(`设置wyyIndex=${Math.round(offsetY / ITEM_HEIGHT)}`);
      setActiveWyyLevelIndex(Math.round(offsetY / ITEM_HEIGHT));
    }
    if (renderType === 'skipStart') {
      console.log(`触发设置skipStart：${Math.round(offsetY / ITEM_HEIGHT)}`);
      setActiveSkipStart(Math.round(offsetY / ITEM_HEIGHT));
    }
    if (renderType === 'skipEnd') {
      console.log(`触发设置skipEnd：${Math.round(offsetY / ITEM_HEIGHT)}`);
      setActiveSkipEnd(Math.round(offsetY / ITEM_HEIGHT));
    }
  };

  const endDragTimer = useRef(undefined);
  const onScrollEndDrag = () => {
    // console.log(
    //   '页面停止滑动了,activeQQLevelIndex' +
    //     activeQQLevelIndex +
    //     ' wyyIndex:' +
    //     activeWyyLevelIndex,
    // );
    // 离手后0.5秒再修正
    console.log(`清除定时器：${endDragTimer.current}`);
    clearTimeout(endDragTimer.current);
    endDragTimer.current = setTimeout(() => {
      console.log('准备滑动onScrollEndDrag~');
      if (clockModalVisible) {
        hourScrollRef.current?.scrollTo({
          y: activeHour * ITEM_HEIGHT, // 每个 item 高度为 50
          animated: true,
        });

        //console.log('准备滑动min部分~');
        minuteScrollRef.current?.scrollTo({
          y: activeMin * ITEM_HEIGHT, // 每个 item 高度为 50
          animated: true,
        });
      }
      if (rateModalVisible) {
        rateScrollRef.current?.scrollTo({
          y: activeRateIndex * ITEM_HEIGHT, // 每个 item 高度为 50
          animated: true,
        });
      }

      if (hifiModalVisible) {
        qqLevelRef.current?.scrollTo({
          y: activeQQLevelIndex * ITEM_HEIGHT, // 每个 item 高度为 50
          animated: true,
        });

        wyyLevelRef.current?.scrollTo({
          y: activeWyyLevelIndex * ITEM_HEIGHT, // 每个 item 高度为 50
          animated: true,
        });
      }

      if (skipModalVisible) {
        console.log(`准备滑动start到${activeSkipStart}`);
        skipStartScrollRef.current?.scrollTo({
          y: activeSkipStart * ITEM_HEIGHT, // 每个 item 高度为 50
          animated: true,
        });

        console.log(`准备滑动end到${activeSkipEnd}`);
        skipEndScrollRef.current?.scrollTo({
          y: activeSkipEnd * ITEM_HEIGHT, // 每个 item 高度为 50
          animated: true,
        });
      }
    }, 50);
    console.log(
      `创建了定时器：${endDragTimer.current} 此时activeEnd：${activeSkipEnd}`,
    );
  };

  useEffect(() => {
    if (skipModalVisible) {
      // 显示了片头片尾模态框
      skipStartScrollRef.current?.scrollTo({
        y: skipStart * ITEM_HEIGHT, // 每个 item 高度为 50
        animated: true,
      });
      console.log(`滑动start到：${skipStart}`);
      skipEndScrollRef.current?.scrollTo({
        y: skipEnd * ITEM_HEIGHT, // 每个 item 高度为 50
        animated: true,
      });
      console.log(`滑动end到：${skipEnd}`);
      // setActiveSkipStart(skipStart);
      // setActiveSkipEnd(skipEnd);
    }
  }, [skipModalReady]);

  useEffect(() => {
    if (hifiModalVisible) {
      qqLevelRef.current?.scrollTo({
        y: qqLevel * ITEM_HEIGHT, // 每个 item 高度为 50
        animated: true,
      });
      console.log(`滑动qqLevel到：${skipStart}`);
      wyyLevelRef.current?.scrollTo({
        y: wyyLevel * ITEM_HEIGHT, // 每个 item 高度为 50
        animated: true,
      });
      console.log(`滑动wyy到：${skipEnd}`);
    }
  }, [hifiModalVisible]);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
      }}>
      <View
        style={{
          flex: 2,
          alignItems: 'center',
          justifyContent: 'space-evenly',
          width: '100%',
        }}>
        {!isEmpty(currentPlay.songItem?.platform) && (
          <Image
            source={MyUtils.buildPlatformImg(
              currentPlay.songItem?.platform as string,
            )}
            style={{ height: 25, width: 25 }}
          />
        )}
        <Text style={styles.songTitle} numberOfLines={1}>
          {currentPlay.songItem?.songTitle || '暂无播放中的歌曲'}
        </Text>
        <Text style={styles.artist} numberOfLines={1}>
          {currentPlay.songItem?.singerName}
        </Text>
      </View>

      {/* 唱片或者歌词 */}
      {showLrc && (
        <View
          style={{
            flex: 6,
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
          }}
          onLayout={onLayout}>
          <TouchableOpacity activeOpacity={0.7} onPress={handleShowLrc}>
            <ScrollView
              showsVerticalScrollIndicator={false} // 隐藏垂直滚动条
              showsHorizontalScrollIndicator={false} // 隐藏水平滚动条（如果有的话）
              ref={scrollViewRef}
              onLayout={event =>
                setScrollViewHeight(event.nativeEvent.layout.height)
              }>
              {lyrics.map(({ text }, index) => {
                const isActive = index === currentIndex;
                return (
                  <Text
                    key={index}
                    style={{
                      fontSize: isActive ? fontSizes.normal : fontSizes.small, // 当前行变大
                      fontWeight: isActive ? 'bold' : 'normal', // 当前行加粗
                      color: isActive
                        ? colors.fontColorBlue
                        : colors.fontColorVeryLightGray, // 当前行高亮
                      marginVertical: 5,
                      textAlign: 'center',
                    }}
                    onLayout={event => {
                      if (
                        itemHeight === 0 ||
                        itemHeight > event.nativeEvent.layout.height
                      ) {
                        setItemHeight(event.nativeEvent.layout.height);
                      }
                    }}>
                    {text}
                  </Text>
                );
              })}
            </ScrollView>
          </TouchableOpacity>
        </View>
      )}
      {!showLrc && (
        <View
          style={{
            flex: 6,
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
          }}
          onLayout={onLayout}>
          <TouchableOpacity activeOpacity={0.7} onPress={handleShowLrc}>
            <Animated.Image
              source={
                isEmpty(currentPlay.songItem?.songImg)
                  ? require('./assets/images/record.png')
                  : { uri: currentPlay.songItem?.songImg }
              }
              style={[
                {
                  width: size,
                  height: size,
                  borderRadius: size / 2,
                  borderWidth: 5,
                  borderColor: '#f2f2f2',
                },
                { transform: [{ rotate: spin }] },
              ]}
            />
          </TouchableOpacity>
        </View>
      )}

      {/* <View style={{ flex: 1 }} /> */}
      {/* 进度条 */}
      <View
        style={{
          flex: 1,
          //flexDirection: 'row',
          alignItems: 'center',
          marginVertical: 10,
          width: '90%',
        }}>
        <Slider
          style={{ flex: 2, width: '100%' }}
          minimumValue={0}
          maximumValue={getDuration()}
          value={getPosition()}
          onValueChange={handleSliderValueChange}
          onSlidingComplete={handleSilderMoveComplete}
          minimumTrackTintColor={colors.bgBlue}
          maximumTrackTintColor="#000"
          thumbTintColor={colors.bgBlue}
          //thumbImage={require('./20.png')}
        />
        <View
          style={{
            flex: 1,
            flexDirection: 'row', // 水平布局
            alignItems: 'center',
            justifyContent: 'space-between', // 左右两端对齐
            width: '100%', // 占满 Slider 宽度

            //marginTop: 5, // 给 Slider 和 Text 之间留一点间距
          }}>
          <Text
            style={{
              color: colors.fontColorLightGray,
              fontSize: fontSizes.small,
              width: '20%',
              //fontWeight: 'bold'
            }}>
            {MyUtils.formatPlayerTime(getPosition())} {/* 起始时间 */}
          </Text>
          {usePlaylistStore.getState().loading() ? (
            <Text
              style={{
                color: colors.fontColorLightGray,
                fontSize: fontSizes.verySmall,
                //marginTop: 2,
                //fontWeight: 'bold'
              }}>
              加载中，请稍候~
            </Text>
          ) : (
            <View
              style={{
                flexDirection: 'row',
                width: '50%',
                alignContent: 'center',
                justifyContent: 'center',
              }}>
              <Text
                style={{
                  color: colors.fontColorLightGray,
                  fontSize: fontSizes.littleSmall,
                  marginRight: 4,
                  //marginTop: 2,
                  //fontWeight: 'bold'
                }}>
                {`音质-${buildMusicLevelDesc()}`}
              </Text>
              <Text
                style={{
                  color: colors.fontColorLightGray,
                  fontSize: fontSizes.littleSmall,
                  marginLeft: 4,
                  //marginTop: 2,
                  //fontWeight: 'bold'
                }}>
                {`速度-${
                  playRate === undefined ? '1.00' : playRate.toFixed(2)
                }`}
              </Text>
            </View>
          )}
          <Text
            style={{
              color: colors.fontColorLightGray,
              fontSize: fontSizes.small,
              width: '20%',
              textAlign: 'right',
              //fontWeight: 'bold',
            }}>
            {MyUtils.formatPlayerTime(getDuration())} {/* 结束时间 */}
          </Text>
        </View>
      </View>

      {/* 功能按钮 */}
      <View
        style={{
          flex: 1,
          flexDirection: 'row',
          justifyContent: 'space-between',
          width: '85%',
          marginVertical: 20,
        }}>
        <TouchableOpacity
          style={{
            width: 30, // 设定固定宽度
            height: 30, // 设定固定高度
            alignItems: 'center', // 内容水平居中
            justifyContent: 'center', // 内容垂直居中
          }}
          onPress={() => {
            // console.log(
            //   `此时qq-${activeQQLevelIndex} level-${activeWyyLevelIndex}`,
            // );
            setHifiModalVisible(true);
            // setTimeout(() => {
            //   onScrollEndDrag();
            // }, 500);
          }}>
          <Icon
            name="square-h"
            size={iconSizes.veryBig}
            color={hifiEnabled ? colors.bgBlue : '#666666'}
            solid={hifiEnabled}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={{
            width: 30, // 设定固定宽度
            height: 30, // 设定固定高度
            alignItems: 'center', // 内容水平居中
            justifyContent: 'center', // 内容垂直居中
          }}
          onPress={() => {
            if (rateEnabled) {
              // 开启了，需要关闭
              setActiveRateIndex(0);
              setRateEnabled(false);
              playerCore.setPlayRate(rates[0]);
              // usePlaylistStore
              //   .getState()
              //   .updateCurrentPlay({ playRate: rates[0] });
              logUtil.info(`恢复播放的速度为${rates[0].toFixed(2)}~`, 'PLAY');
              ToastUtil.showDefaultToast(
                `恢复播放的速度为${rates[0].toFixed(2)}~`,
              );
            } else {
              setRateModalVisible(true);
            }
          }}>
          <Icon
            name="forward"
            size={iconSizes.veryBig}
            color={rateEnabled ? colors.bgBlue : '#666666'}
            solid={rateEnabled}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={{
            width: 30, // 设定固定宽度
            height: 30, // 设定固定高度
            alignItems: 'center', // 内容水平居中
            justifyContent: 'center', // 内容垂直居中
          }}
          onPress={toggleClockEnable}>
          <Icon
            name="clock"
            size={iconSizes.veryBig}
            color={clockEnabled ? colors.bgBlue : '#666666'}
            solid={clockEnabled}
          />
        </TouchableOpacity>
        {currentPlay.songItem?.songType === 'sound' ? (
          <TouchableOpacity
            style={{
              width: 30, // 设定固定宽度
              height: 30, // 设定固定高度
              alignItems: 'center', // 内容水平居中
              justifyContent: 'center', // 内容垂直居中
            }}
            onPress={() => {
              setSkipModalVisible(true);
              // onScrollEndDrag();
              // setTimeout(() => {
              //   console.log('执行setTimeOut');
              //   onScrollEndDrag();
              // }, 500);
            }}>
            <Icon
              name="scissors"
              size={iconSizes.veryBig}
              color={skipEnabled ? colors.bgBlue : '#666666'}
              solid={skipEnabled}
            />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={{
              width: 30, // 设定固定宽度
              height: 30, // 设定固定高度
              alignItems: 'center', // 内容水平居中
              justifyContent: 'center', // 内容垂直居中
            }}
            onPress={handleShowLrc}>
            <Icon
              name="file-lines"
              size={iconSizes.veryBig}
              color={showLrc ? colors.bgBlue : '#666666'}
              solid={showLrc}
            />
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={{
            width: 30, // 设定固定宽度
            height: 30, // 设定固定高度
            alignItems: 'center', // 内容水平居中
            justifyContent: 'center', // 内容垂直居中
          }}
          onPress={toggleHeart}>
          {/* regular solid */}
          <Icon
            name="heart"
            size={iconSizes.veryBig}
            color={heart ? 'red' : '#666666'}
            solid={heart}
            //onPress={toggleHeart}
          />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            // if (currentPlay.songItem?.songType === 'sound') {
            //   ToastUtil.showErrorToast('抱歉，有声书内测，暂不支持下载~');
            //   return;
            // }

            if (isEmpty(currentPlay.songItem)) {
              ToastUtil.showErrorToast('没有播放中的歌曲~');
              return;
            }
            const isExistInDownloadList = useDownloadListStore
              .getState()
              .downLoadList.some(
                item =>
                  item.platform === currentPlay.songItem?.platform &&
                  item.songId === currentPlay.songItem.songId,
              );
            if (isExistInDownloadList) {
              ToastUtil.showErrorToast(
                `歌曲：${currentPlay.songItem.platform}-${currentPlay.songItem.songTitle}-${currentPlay.songItem.singerName}\n已存在于下载队列，无需添加~`,
              );
              return;
            }
            useDownloadListStore
              .getState()
              .addSong(currentPlay.songItem as Song);
            downloadCore.startDownload();
            ToastUtil.showDefaultToast('已添加到下载队列');
          }}
          style={{
            width: 30, // 设定固定宽度
            height: 30, // 设定固定高度
            alignItems: 'center', // 内容水平居中
            justifyContent: 'center', // 内容垂直居中
          }}>
          <Icon
            name="download"
            size={iconSizes.veryBig}
            color={getDownloadColor()}
          />
        </TouchableOpacity>
      </View>

      {/* 播放控制按钮 */}
      <View
        style={{
          flex: 1,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: '85%',
          marginVertical: 5,
        }}>
        <TouchableOpacity
          style={{
            width: 30, // 设定固定宽度
            height: 30, // 设定固定高度
            alignItems: 'center', // 内容水平居中
            justifyContent: 'center', // 内容垂直居中
          }}
          onPress={() => {
            let nextModeIndex = PlayMode.Order;
            if (!isUndefined(currentPlay.playMode)) {
              nextModeIndex =
                ((currentPlay.playMode as number) + 1) %
                (Object.keys(PlayMode).length / 2);
            }

            let nextPlayMode = nextModeIndex as PlayMode;
            if (nextPlayMode === PlayMode.Order) {
              ToastUtil.showDefaultToast('顺序播放');
            } else if (nextPlayMode === PlayMode.Random) {
              ToastUtil.showDefaultToast('随机播放');
            } else if (nextPlayMode === PlayMode.Single) {
              ToastUtil.showDefaultToast('单曲循环');
            }
            usePlaylistStore
              .getState()
              .updateCurrentPlay({ playMode: nextPlayMode });
          }}>
          <Icon
            name={getPlayModeIconName()}
            size={iconSizes.veryBig}
            color="#666666"
          />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            playerCore.prev();
          }}>
          <Icon
            name="backward-step"
            size={iconSizes.veryVeryBig}
            color={colors.fontColorLightGray}
          />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            togglePlayPause();
          }}>
          {currentPlay.isPlaying ? (
            <Icon
              name="pause"
              size={iconSizes.max}
              color={colors.fontColorLightGray}
            />
          ) : (
            <Icon
              name="play"
              size={iconSizes.max}
              color={colors.fontColorLightGray}
            />
          )}
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            playerCore.next(false);
          }}>
          <Icon
            name="forward-step"
            size={iconSizes.veryVeryBig}
            color={colors.fontColorLightGray}
          />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={toggleModal}
          style={{
            width: 30, // 设定固定宽度
            height: 30, // 设定固定高度
            alignItems: 'center', // 内容水平居中
            justifyContent: 'center', // 内容垂直居中
          }}>
          <Icon name="list" size={iconSizes.veryBig} color="#666666" />
        </TouchableOpacity>
      </View>
      <View
        style={{
          flex: 1,
          alignContent: 'space-around',
          justifyContent: 'center',
        }}>
        {clockEnabled && (
          <Text
            style={{
              color: colors.fontColorBlue,
              fontSize: fontSizes.small,
              //marginTop: 2,
              //fontWeight: 'bold'
            }}>
            {buildLeftClockTimeDesc()}
          </Text>
        )}
      </View>
      {(isModalVisible ||
        clockModalVisible ||
        rateModalVisible ||
        hifiModalVisible ||
        skipModalVisible) && (
        <BlurView
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            bottom: 0,
            right: 0,
          }}
          blurType="light" // 模糊类型：light, dark, or extra-dark
          blurAmount={5} // 模糊程度
          reducedTransparencyFallbackColor="white" // 不支持模糊时的背景颜色
        />
      )}
      {/* 新页面的 Modal */}
      <Modal
        isVisible={isModalVisible}
        style={{
          justifyContent: 'flex-end', // 新页面从底部弹出
          margin: 0, // 禁用默认的 margin
        }}
        backdropOpacity={0} // 禁用默认背景，使用模糊效果
        onBackdropPress={toggleModal} // 点击模糊部分关闭新页面
        onBackButtonPress={toggleModal}>
        <View
          style={{
            height: '65%', // 新页面占据下半部分
            backgroundColor: 'white',
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            //padding: 20,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <View style={{ flex: 1, width: '100%', backgroundColor: '#F5F5F5' }}>
            {/* 标题 */}
            <View
              style={{
                paddingVertical: 20,
                //backgroundColor: '#2196F3',
                alignItems: 'center',
                flexDirection: 'row',
                position: 'relative', // 确保子元素的绝对定位基于这个容器
              }}>
              <Text
                style={{
                  fontSize: fontSizes.big,
                  color: '#000',
                  fontWeight: 'bold',
                  position: 'absolute', // 绝对定位
                  left: 0,
                  right: 0,
                  textAlign: 'center',
                  //left: '50%', // 水平偏移到容器中心
                  //transform: [{ translateX: -50 }], // 偏移自身宽度的一半，确保绝对居中
                }}>
                播放列表
              </Text>
              <TouchableOpacity
                onPress={() => {
                  if (isEmpty(allPlayQueueData)) {
                    ToastUtil.showErrorToast('播放列表已经为空');
                    return;
                  }
                  usePlaylistStore.getState().setPlaylist([]);
                  ToastUtil.showDefaultToast('已清空播放列表');
                }}
                style={{
                  padding: 3,
                  flexDirection: 'row',
                  marginRight: 25,
                  borderRadius: 5,
                  backgroundColor: '#E0E0E0',
                  alignSelf: 'flex-start', // 让按钮宽度仅匹配内容
                  alignItems: 'center', // 垂直居中
                  marginLeft: 'auto', // 让按钮右对齐
                  //justifyContent: 'center',
                }}>
                <Text style={{ fontSize: fontSizes.small, color: '#666' }}>
                  清空
                </Text>
                <Icon
                  name="xmark"
                  size={iconSizes.normal}
                  color="red"
                  style={{ marginHorizontal: 5, paddingTop: 2 }}
                />
              </TouchableOpacity>
            </View>

            <SongList
              renderScenario="playQueue"
              songItems={songItemsData}
              loadMoreData={loadMoreData}
              setModalClosed={setModalClosed}
              hasMoreUpData={hasMoreUpData.current}
              hasMoreDownData={hasMoreDownData.current}
            />
          </View>
        </View>
      </Modal>

      {/* 时间选择模态框 */}
      <Modal
        visible={clockModalVisible}
        style={{
          // justifyContent: 'flex-end', // 新页面从底部弹出
          // margin: 0, // 禁用默认的 margin
          margin: 0, // 禁用默认的 margin
          flex: 1, // 使用 flex 布局让模态框充满整个屏幕
          justifyContent: 'center', // 居中对齐
        }}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setClockModalVisible(false)}>
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
                设置定时关闭
              </Text>
            </View>
            {/* 时间选择器 */}

            <View style={styles1.pickerContainer}>
              <View
                style={{
                  flexDirection: 'col',
                  height: ITEM_HEIGHT * VISIBLE_ITEMS,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginVertical: 10,
                }}>
                <Text
                  style={{
                    fontSize: fontSizes.normal,
                    color: '#000',
                    height: ITEM_HEIGHT,
                  }}>
                  小时
                </Text>
                <ScrollView
                  ref={hourScrollRef}
                  onScroll={event => {
                    handleScroll(event, 'hour');
                  }}
                  showsVerticalScrollIndicator={false}
                  snapToInterval={ITEM_HEIGHT}
                  onMomentumScrollEnd={onScrollEndDrag}
                  contentContainerStyle={styles1.scrollContent}>
                  {renderNumbers(hours, 'hour')}
                </ScrollView>
              </View>
              <View
                style={{
                  flexDirection: 'col',
                  height: ITEM_HEIGHT * VISIBLE_ITEMS,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginVertical: 10,
                }}>
                <Text style={styles1.separator}>:</Text>
              </View>

              <View
                style={{
                  flexDirection: 'col',
                  height: ITEM_HEIGHT * VISIBLE_ITEMS,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginVertical: 10,
                }}>
                <Text
                  style={{
                    fontSize: fontSizes.normal,
                    color: '#000',
                    height: ITEM_HEIGHT,
                  }}>
                  分钟
                </Text>
                <ScrollView
                  ref={minuteScrollRef}
                  onScroll={event => handleScroll(event, 'min')}
                  showsVerticalScrollIndicator={false}
                  snapToInterval={ITEM_HEIGHT}
                  onMomentumScrollEnd={onScrollEndDrag}
                  contentContainerStyle={styles1.scrollContent}>
                  {renderNumbers(minutes, 'min')}
                </ScrollView>
              </View>
            </View>

            {/* 选中指示器 */}
            {/* <View style={styles1.selectionIndicator} /> */}

            {/* 操作按钮 */}
            <View style={styles1.buttonRow}>
              <TouchableOpacity
                style={[styles1.button, styles1.cancelButton]}
                onPress={() => {
                  setActiveHour(0);
                  setActiveMin(0);
                  setClockModalVisible(false);
                }}>
                <Text style={styles1.buttonText}>取消</Text>
                <Icon
                  name="xmark"
                  size={iconSizes.normal}
                  color={colors.bgWhite}
                  style={{
                    marginLeft: 8,
                  }}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles1.button, styles1.confirmButton]}
                onPress={handleConfirmClock}>
                <Text style={styles1.buttonText}>确认</Text>
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

      {/* 播放速度选择模态框 */}
      <Modal
        visible={rateModalVisible}
        style={{
          // justifyContent: 'flex-end', // 新页面从底部弹出
          // margin: 0, // 禁用默认的 margin
          margin: 0, // 禁用默认的 margin
          flex: 1, // 使用 flex 布局让模态框充满整个屏幕
          justifyContent: 'center', // 居中对齐
        }}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setRateModalVisible(false)}>
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
                设置播放速度
              </Text>
            </View>

            <View
              style={[styles1.pickerContainer, { flexDirection: 'column' }]}>
              <Text
                style={{
                  fontSize: fontSizes.normal,
                  color: '#000',
                  height: ITEM_HEIGHT,
                }}>
                可选速率
              </Text>
              <ScrollView
                ref={rateScrollRef}
                onScroll={event => {
                  handleScroll(event, 'rate');
                }}
                showsVerticalScrollIndicator={false}
                snapToInterval={ITEM_HEIGHT}
                onMomentumScrollEnd={onScrollEndDrag}
                contentContainerStyle={styles1.scrollContent}>
                {renderNumbers(rates, 'rate')}
              </ScrollView>
            </View>

            {/* 选中指示器 */}
            {/* <View style={styles1.selectionIndicator} /> */}

            {/* 操作按钮 */}
            <View style={styles1.buttonRow}>
              <TouchableOpacity
                style={[styles1.button, styles1.cancelButton]}
                onPress={() => {
                  setActiveRateIndex(0);
                  setRateModalVisible(false);
                }}>
                <Text style={styles1.buttonText}>取消</Text>
                <Icon
                  name="xmark"
                  size={iconSizes.normal}
                  color={colors.bgWhite}
                  style={{
                    marginLeft: 8,
                  }}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles1.button, styles1.confirmButton]}
                onPress={handleConfirmRate}>
                <Text style={styles1.buttonText}>确认</Text>
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

      <Modal
        visible={hifiModalVisible}
        style={{
          // justifyContent: 'flex-end', // 新页面从底部弹出
          // margin: 0, // 禁用默认的 margin
          margin: 0, // 禁用默认的 margin
          flex: 1, // 使用 flex 布局让模态框充满整个屏幕
          justifyContent: 'center', // 居中对齐
        }}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setHifiEnabled(false)}>
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
                  color: colors.fontColorDrakGray,

                  // position: 'absolute', // 绝对定位
                  // left: 0,
                  // right: 0,
                  // textAlign: 'center',
                  //left: '50%', // 水平偏移到容器中心
                  //transform: [{ translateX: -50 }], // 偏移自身宽度的一半，确保绝对居中
                }}>
                设置音乐播放/下载品质
              </Text>
              <Text
                style={{
                  fontSize: fontSizes.small,
                  color: colors.fontColorVeryLightGray,
                  marginTop: 3,
                }}>
                注意：此配置同时对播放和下载生效
              </Text>
              <Text
                style={{
                  fontSize: fontSizes.small,
                  color: colors.fontColorVeryLightGray,
                  marginTop: 3,
                }}>
                QQ和网易云的无损选项需分别设置
              </Text>

              <Text
                style={{
                  fontSize: fontSizes.small,
                  color: colors.fontColorRed,
                  marginTop: 3,
                }}>
                对应音源不存在时会自动降级
              </Text>
              <Text
                style={{
                  fontSize: fontSizes.small,
                  color: colors.fontColorRed,
                  marginTop: 3,
                }}>
                {`资源所限，无损音源每日限额${hifiLimit}次`}
              </Text>
              <Text
                style={{
                  fontSize: fontSizes.small,
                  color: colors.fontColorRed,
                  marginTop: 3,
                }}>
                {`今天已听${hifiPlaied}次，超过限额也会降级`}
              </Text>
              {/* <Text
                style={{
                  fontSize: fontSizes.small,
                  color: colors.fontColorRed,
                  marginTop: 3,
                }}>
                目前每日限额无损试听30首
              </Text> */}
            </View>
            {/* 时间选择器 */}

            <View style={styles1.pickerContainer}>
              <View
                style={{
                  flexDirection: 'col',
                  height: ITEM_HEIGHT * VISIBLE_ITEMS,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginVertical: 10,
                }}>
                <Text
                  style={{
                    fontSize: fontSizes.normal,
                    color: '#000',
                    height: ITEM_HEIGHT,
                  }}>
                  QQ
                </Text>
                <ScrollView
                  ref={qqLevelRef}
                  onScroll={event => {
                    handleScroll(event, 'qqLevel');
                  }}
                  showsVerticalScrollIndicator={false}
                  snapToInterval={ITEM_HEIGHT}
                  onMomentumScrollEnd={onScrollEndDrag}
                  contentContainerStyle={styles1.scrollContent}>
                  {renderNumbers(MyUtils.getQQLevelDescs(), 'qqLevel')}
                </ScrollView>
              </View>
              <View
                style={{
                  flexDirection: 'col',
                  height: ITEM_HEIGHT * VISIBLE_ITEMS,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginVertical: 10,
                }}>
                <Text style={styles1.separator} />
              </View>

              <View
                style={{
                  flexDirection: 'col',
                  height: ITEM_HEIGHT * VISIBLE_ITEMS,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginVertical: 10,
                }}>
                <Text
                  style={{
                    fontSize: fontSizes.normal,
                    color: '#000',
                    height: ITEM_HEIGHT,
                  }}>
                  网易云
                </Text>
                <ScrollView
                  ref={wyyLevelRef}
                  onScroll={event => handleScroll(event, 'wyyLevel')}
                  showsVerticalScrollIndicator={false}
                  snapToInterval={ITEM_HEIGHT}
                  onMomentumScrollEnd={onScrollEndDrag}
                  contentContainerStyle={styles1.scrollContent}>
                  {renderNumbers(MyUtils.getWyyLevelDescs(), 'wyyLevel')}
                </ScrollView>
              </View>
            </View>

            {/* 选中指示器 */}
            {/* <View style={styles1.selectionIndicator} /> */}

            {/* 操作按钮 */}
            <View style={styles1.buttonRow}>
              <TouchableOpacity
                style={[styles1.button, styles1.cancelButton]}
                onPress={() => {
                  setHifiModalVisible(false);
                }}>
                <Text style={styles1.buttonText}>取消</Text>
                <Icon
                  name="xmark"
                  size={iconSizes.normal}
                  color={colors.bgWhite}
                  style={{
                    marginLeft: 8,
                  }}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles1.button, styles1.confirmButton]}
                onPress={handleConfirmHifi}>
                <Text style={styles1.buttonText}>确认</Text>
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
      <Modal
        visible={skipModalVisible}
        style={{
          // justifyContent: 'flex-end', // 新页面从底部弹出
          // margin: 0, // 禁用默认的 margin
          margin: 0, // 禁用默认的 margin
          flex: 1, // 使用 flex 布局让模态框充满整个屏幕
          justifyContent: 'center', // 居中对齐
          //alignItems: 'center', // 居中对齐
        }}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSkipEnabled(false)}>
        {skipModalReady && (
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
                    color: colors.fontColorDrakGray,
                  }}>
                  跳过片头片尾
                </Text>
                <Text
                  style={{
                    fontSize: fontSizes.small,
                    color: colors.fontColorVeryLightGray,
                    marginTop: 3,
                  }}>
                  设置仅针对当前专辑生效，单位秒
                </Text>
                {/* <Text
                style={{
                  fontSize: fontSizes.small,
                  color: colors.fontColorRed,
                  marginTop: 3,
                }}>
                目前每日限额无损试听30首
              </Text> */}
              </View>
              {/* 时间选择器 */}

              <View style={styles1.pickerContainer}>
                <View
                  style={{
                    flexDirection: 'col',
                    height: ITEM_HEIGHT * VISIBLE_ITEMS,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginVertical: 10,
                  }}>
                  <Text
                    style={{
                      fontSize: fontSizes.normal,
                      color: '#000',
                      height: ITEM_HEIGHT,
                    }}>
                    片头
                  </Text>
                  <ScrollView
                    ref={skipStartScrollRef}
                    onScroll={event => {
                      handleScroll(event, 'skipStart');
                    }}
                    showsVerticalScrollIndicator={false}
                    snapToInterval={ITEM_HEIGHT}
                    onMomentumScrollEnd={onScrollEndDrag}
                    contentContainerStyle={styles1.scrollContent}>
                    {renderNumbers(skipStartSeconds, 'skipStart')}
                  </ScrollView>
                </View>
                <View
                  style={{
                    flexDirection: 'col',
                    height: ITEM_HEIGHT * VISIBLE_ITEMS,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginVertical: 10,
                  }}>
                  <Text style={styles1.separator} />
                </View>

                <View
                  style={{
                    flexDirection: 'col',
                    height: ITEM_HEIGHT * VISIBLE_ITEMS,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginVertical: 10,
                  }}>
                  <Text
                    style={{
                      fontSize: fontSizes.normal,
                      color: '#000',
                      height: ITEM_HEIGHT,
                    }}>
                    片尾
                  </Text>
                  <ScrollView
                    ref={skipEndScrollRef}
                    onScroll={event => handleScroll(event, 'skipEnd')}
                    showsVerticalScrollIndicator={false}
                    snapToInterval={ITEM_HEIGHT}
                    onMomentumScrollEnd={onScrollEndDrag}
                    contentContainerStyle={styles1.scrollContent}>
                    {renderNumbers(skipEndSeconds, 'skipEnd')}
                  </ScrollView>
                </View>
              </View>

              {/* 选中指示器 */}
              {/* <View style={styles1.selectionIndicator} /> */}

              {/* 操作按钮 */}
              <View style={styles1.buttonRow}>
                <TouchableOpacity
                  style={[styles1.button, styles1.cancelButton]}
                  onPress={() => {
                    setSkipModalVisible(false);
                  }}>
                  <Text style={styles1.buttonText}>取消</Text>
                  <Icon
                    name="xmark"
                    size={iconSizes.normal}
                    color={colors.bgWhite}
                    style={{
                      marginLeft: 8,
                    }}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles1.button, styles1.confirmButton]}
                  onPress={handleConfirmSkip}>
                  <Text style={styles1.buttonText}>确认</Text>
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
        )}
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
    width: '70%',
    //marginHorizontal: 20,
    borderRadius: 12,
    padding: 20,
  },
  pickerContainer: {
    flexDirection: 'row',
    height: ITEM_HEIGHT * VISIBLE_ITEMS,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  scrollContent: {
    paddingVertical: ITEM_HEIGHT,
  },
  numberContainer: {
    height: ITEM_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
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

  separator: {
    fontSize: fontSizes.normal,
    fontWeight: 'bold',
    marginHorizontal: 20,
    marginTop: ITEM_HEIGHT,
    //alignSelf: 'flex-end',
    //height: ITEM_HEIGHT,
    //lineHeight: ITEM_HEIGHT * 3,
    color: colors.fontColorDrakGray,
  },
  selectionIndicator: {
    position: 'absolute',
    top: '50%',
    height: ITEM_HEIGHT,
    width: '100%',
    backgroundColor: 'rgba(200,200,200,0.2)',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#007AFF',
    transform: [{ translateY: -ITEM_HEIGHT / 2 }],
  },
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
    backgroundColor: '#121212',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  songTitle: {
    color: colors.fontColorBlack,
    fontSize: fontSizes.normal,
    fontWeight: 'bold',
    textAlign: 'center',
    width: '95%',
  },
  artist: {
    color: colors.fontColorLightGray,
    fontSize: fontSizes.small,
    textAlign: 'center',
    width: '95%',
  },
  recordContainer: {
    marginVertical: 20,
  },
  record: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 5,
    borderColor: '#2196F3',
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
    width: '80%',
  },
  progressBar: {
    flex: 1,
    marginHorizontal: 10,
  },
  timeText: {
    color: '#000',
    fontSize: fontSizes.small,
  },
  functionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '90%',
    marginVertical: 20,
  },
  functionButton: {
    color: '#000',
    fontSize: fontSizes.normal,
  },
  controlButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '60%',
    marginVertical: 20,
  },
});

export default MainPlayer;
