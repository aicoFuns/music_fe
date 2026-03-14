import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
  Easing,
  Dimensions,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome6';
import usePlaylistStore from './global/usePlaylistStore';
import { isEmpty } from 'lodash';
import playerCore from './playerCore';
import { useNavigation } from '@react-navigation/native';
import { colors, fontSizes } from './Common.styles';

const SmallPlayer = React.memo(() => {
  const navigation = useNavigation();
  //const currentPlay = usePlaylistStore.gets
  const currentPlay = usePlaylistStore(state => state.currentPlay);
  // console.log(
  //   new Date() +
  //     ' 渲染small player: currentPlay:' +
  //     JSON.stringify(currentPlay),
  // );
  // const progress = useProgress();
  //const [isCurrentPlayChanged, setIsCurrentPlayChanged] = useState(false);
  //const [isPlaying, setIsPlaying] = useState(currentPlay.isPlaying);
  // 控制旋转动画
  const spinValue = useRef(new Animated.Value(0)).current;
  const currentRotation = useRef(0);
  //const isPlayingRef = useRef(isPlaying);

  // usePlayEvents({
  //   refreshCurrentPlay: () => {
  //     //setIsCurrentPlayChanged(!isCurrentPlayChanged);
  //   },
  // });
  // 歌曲名滚动动画
  //onst translateX = useRef(new Animated.Value(0)).current; // 初始位置动画值
  //const [textWidth, setTextWidth] = useState(0); // 记录文本实际宽度
  //const [containerWidth, setContainerWidth] = useState(0); // 记录文本实际宽度

  //const [showScrollView, setShowScrollView] = useState(false);

  const getSongImg = () => {
    if (!isEmpty(currentPlay.songItem?.songImg)) {
      return { uri: currentPlay.songItem?.songImg };
    }
    return require('./assets/images/record.png');
  };

  const getSongTitle = () => {
    if (currentPlay.isPlaying || !isEmpty(currentPlay.songItem)) {
      return currentPlay.songItem?.songTitle;
    }
    return '暂无歌曲';
  };

  const getSingerName = () => {
    if (currentPlay.isPlaying || !isEmpty(currentPlay.songItem)) {
      return currentPlay.songItem?.singerName;
    }
    return '';
  };

  const useSingLine = () => {
    const titleLength = getSongTitle()?.length;
    const singerLength = getSingerName()?.length;
    //console.log(`titleLength:${titleLength} singerLength:${singerLength}`);
    return titleLength + singerLength < 8;
  };

  // useEffect(() => {
  //   // 延迟渲染 ScrollView
  //   const timer = setTimeout(() => {
  //     setShowScrollView(true);
  //   }, 2000); // 100 毫秒延迟（可以根据需要调整）
  //   return () => clearTimeout(timer);
  // }, []);

  // useEffect(() => {
  //   console.log(`textWidth:${textWidth} containerWidth:${containerWidth}`);
  //   // 当文本宽度大于容器宽度时，启动滚动动画
  //   if (textWidth > containerWidth) {
  //     startScrolling();
  //   }
  // }, [textWidth]);

  // const startScrolling = () => {
  //   Animated.loop(
  //     Animated.sequence([
  //       Animated.timing(translateX, {
  //         toValue: -(textWidth - containerWidth), // 向左移动的距离
  //         duration: 5000, // 动画时长（3秒）
  //         easing: Easing.linear, // 匀速动画
  //         useNativeDriver: true,
  //       }),
  //       Animated.timing(translateX, {
  //         toValue: 0, // 返回到初始位置
  //         duration: 0, // 瞬间返回
  //         useNativeDriver: true,
  //       }),
  //     ]),
  //   ).start();
  // };

  // 同步最新状态到 ref
  // useEffect(() => {
  //   isPlayingRef.current = isPlaying;
  // }, [isPlaying]);

  // 启动旋转动画
  const startRotation = () => {
    spinValue.setValue(currentRotation.current);
    Animated.timing(spinValue, {
      toValue: currentRotation.current + 360,
      duration: 20000,
      easing: Easing.linear,
      useNativeDriver: true,
    }).start(item => {
      currentRotation.current += 360;
      if (currentPlay.isPlaying && item.finished) {
        startRotation();
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

  const rotateInterpolation = spinValue.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '360deg'],
  });
  // 播放/暂停功能
  const togglePlayPause = async () => {
    playerCore.togglePlayOrPause();
  };

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8f8f8',
        paddingRight: 25,
        paddingLeft: 10,
        paddingVertical: 10,
        borderRadius: 10,
        elevation: 5,
      }}>
      {/* 旋转唱片 */}
      <Animated.View
        style={[
          styles.recordContainer,
          { transform: [{ rotate: rotateInterpolation }] },
        ]}>
        <TouchableOpacity onPress={() => (navigation as { navigate: (name: string) => void }).navigate('正在播放')}>
          <Image source={getSongImg()} style={styles.recordImage} />
        </TouchableOpacity>
      </Animated.View>

      {/* 文本区域 */}
      <View
        style={{
          flex: 1,
          marginHorizontal: 5,
          alignItems: 'center',
        }}>
        {/* 歌曲名滚动 */}
        {useSingLine() ? (
          <View style={{ alignItems: 'center', flexDirection: 'row' }}>
            <Text
              onPress={() => (navigation as { navigate: (name: string) => void }).navigate('正在播放')}
              style={{
                fontSize: fontSizes.normal,
                color: colors.fontColorLightGray,
                fontWeight: 'bold',
                //marginVertical: 3,
              }}
              numberOfLines={1}>
              {getSongTitle()}
            </Text>

            <Text
              onPress={() => (navigation as { navigate: (name: string) => void }).navigate('正在播放')}
              style={{
                fontSize: fontSizes.small,
                color: '#666',
                marginVertical: 3,
              }}
              numberOfLines={1}>
              {isEmpty(getSingerName()) ? '' : ` - ${getSingerName()}`}
            </Text>
          </View>
        ) : (
          <View style={{ alignItems: 'center' }}>
            <Text
              onPress={() => (navigation as { navigate: (name: string) => void }).navigate('正在播放')}
              style={{
                //transform: [{ translateX }],
                fontSize: fontSizes.normal,
                fontWeight: 'bold',
                marginVertical: 3,
              }}
              numberOfLines={1}>
              {getSongTitle()}
            </Text>

            <Text
              onPress={() => (navigation as { navigate: (name: string) => void }).navigate('正在播放')}
              style={{
                fontSize: fontSizes.small,
                color: '#666',
                marginVertical: 3,
              }}
              numberOfLines={1}>
              {getSingerName()}
            </Text>
          </View>
        )}
      </View>

      {/* 控制按钮 */}
      <View style={styles.controls}>
        <TouchableOpacity
          onPress={() => {
            playerCore.prev();
            //setIsCurrentPlayChanged(!isCurrentPlayChanged);
          }}>
          <Icon
            name="backward-step"
            size={25}
            color={colors.fontColorLightGray}
          />
        </TouchableOpacity>
        <TouchableOpacity onPress={togglePlayPause} style={styles.playButton}>
          {currentPlay.isPlaying ? (
            <Icon name="pause" size={35} color={colors.fontColorLightGray} />
          ) : (
            <Icon name="play" size={35} color={colors.fontColorLightGray} />
          )}
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            playerCore.next(false);
            //setIsCurrentPlayChanged(!isCurrentPlayChanged);
          }}>
          <Icon
            name="forward-step"
            size={25}
            color={colors.fontColorLightGray}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    padding: 10,
    borderRadius: 10,
    elevation: 5,
  },
  recordContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderColor: '#f2f2f2',
    borderWidth: 2,
  },
  recordImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  textContainer: {
    flex: 1,
    marginLeft: 15,
  },
  titleContainer: {
    height: 25,
    overflow: 'hidden', // 隐藏超出部分
    width: '100%',
  },
  songTitle: {
    fontSize: fontSizes.normal,
    fontWeight: 'bold',
    color: '#333',
  },
  artistName: {
    fontSize: fontSizes.small,
    color: '#666',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden', // 隐藏超出部分
  },
  playButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 5,
    //backgroundColor: '#ff6347',
  },
});

export default SmallPlayer;
