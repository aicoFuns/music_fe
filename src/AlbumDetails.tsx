import React, { useEffect, useRef, useState } from 'react';
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
import logUtil from './utils/LogUtil';

const AlumDetails = ({ route, navigation }) => {
  const { albumId, albumTitle, albumImg, platform } = route.params.albumItem;
  const [results, setResults] = useState([]);
  const hasMoreDownData = useRef(true);
  // 获取播放队列的函数
  const fetchSongs = async () => {
    const response = await apiClient.get(
      `/search/album/detail/${platform}/${albumId}`,
    );
    setResults(response.data.result);
  };

  // 在组件加载时调用 fetchSongs
  useEffect(() => {
    fetchSongs();
  }, []);

  const playSongs = (songItem?: Song) => {
    const filterResult = results.filter(item => item.valid);
    if (isEmpty(filterResult)) {
      ToastUtil.showErrorToast('没有可播放的歌曲');
      return;
    }
    let targetIndex = 0;
    if (!isEmpty(songItem)) {
      targetIndex = filterResult.findIndex(
        item =>
          item.platform === songItem.platform &&
          item.songId === songItem.songId,
      );
      ToastUtil.showDefaultToast(`即将播放：${songItem.songTitle}`);
    } else {
      ToastUtil.showDefaultToast(`即将播放：${filterResult[0].songTitle}`);
    }
    playerCore.clearAndPlayTarget(filterResult, targetIndex);
    logUtil.info(`播放专辑：${albumTitle}`, 'PLAYLIST');
    navigation.navigate('正在播放');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.albumName} numberOfLines={1}>
        {albumTitle}
      </Text>
      {/* 歌手图片 */}
      <Image
        source={{ uri: albumImg }} // 替换为真实歌手图片路径
        style={styles.albumImage}
      />

      <View style={styles.buttonView}>
        {/* 歌手名字 */}

        <TouchableOpacity
          onPress={() => {
            // const filterResult = results.filter(item => item.valid);
            // if (isEmpty(filterResult)) {
            //   ToastUtil.showErrorToast('没有可播放的歌曲');
            //   return;
            // }
            // playerCore.clearAndPlayAll(filterResult);
            // ToastUtil.showDefaultToast(
            //   `即将播放：${filterResult[0].songTitle}`,
            // );
            // logUtil.info(`播放专辑：${albumTitle}`, 'PLAYLIST');
            // navigation.navigate('正在播放');
            playSongs(undefined);
          }}
          style={styles.playAllButton}>
          <Text style={styles.playAllButtonText}>播放</Text>
          <Icon
            name="play"
            size={iconSizes.small}
            color={colors.bgWhite}
            style={styles.playAllButtonIcon}
          />
        </TouchableOpacity>
      </View>

      <SongList
        renderScenario="albumList"
        songItems={results}
        loadMoreData={() => {
          hasMoreDownData.current = false;
          setResults([...results]);
        }}
        hasMoreDownData={hasMoreDownData.current}
        playSongs={playSongs}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgWhite,
  },
  albumImage: {
    width: 150,
    height: 150,
    borderRadius: 75,
    alignSelf: 'center',
    marginTop: 5,
    marginBottom: 10,
  },
  buttonView: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playAllButton: {
    paddingVertical: featureButtonNormal.paddingVertical,
    paddingHorizontal: featureButtonNormal.paddingHorizontal,
    marginHorizontal: 10,

    borderRadius: featureButtonNormal.borderRadius,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgBlue,
  },
  albumName: {
    fontSize: fontSizes.big,

    color: colors.fontColorDrakGray,
    textAlign: 'center',
    marginVertical: 10,
  },
  playAllButtonText: { fontSize: fontSizes.small, color: colors.bgWhite },
  playAllButtonIcon: { marginLeft: 4 },
});

export default AlumDetails;
