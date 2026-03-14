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
import ToastUtil from './utils/ToastUtil';
import { isElement, isEmpty } from 'lodash';
import {
  colors,
  filterButtonSmall,
  fontSizes,
  iconSizes,
} from './Common.styles';
import playerCore from './playerCore';
import logUtil from './utils/LogUtil';

const SingerDetails = ({ route, navigation }) => {
  const [selectedOption, setSelectedOption] = useState('歌曲'); // 当前选项，默认为"歌曲"
  const [results, setResults] = useState([]); // 搜索结果
  const { singerId, singerImg, singerName, platform } = route.params.item;
  const hasMoreData = useRef(true);
  const pageNum = useRef(1);
  const fetchSongsOrAlbums = async () => {
    let searchType = selectedOption === '歌曲' ? 'songs' : 'albums';
    console.log(`当前pageNum.current:${pageNum.current}`);
    const response = await apiClient.get(
      `/search/artist/${searchType}/${platform}/${singerId}?pageNum=${pageNum.current++}`,
    );
    return response.data.result;
  };

  // 在组件加载时调用 fetchSongs
  useEffect(() => {
    pageNum.current = 1;
    hasMoreData.current = true;

    const fetchData = async () => {
      const data = await fetchSongsOrAlbums();
      setResults(data);
    };
    fetchData();
  }, [selectedOption]);

  const loadMoreData = async () => {
    if (!hasMoreData.current) {
      //ToastUtil.showDefaultToast('没有更多数据了...');
      return;
    }

    //setIsLoading(true);
    console.log('在SingerDetails中执行loadMoreData...');
    //ToastUtil.showDefaultToast('加载下一页数据...');
    // 向下加载：在尾部追加数据
    const newData = await fetchSongsOrAlbums();
    if (isEmpty(newData)) {
      hasMoreData.current = false;
    }
    //console.log(`获取到新的搜索结果：${JSON.stringify(newData)}`);
    setResults(prevData => [...prevData, ...newData]);
  };

  const playSongs = async (songItem: Song) => {
    ToastUtil.showDefaultToast('正在获取歌手全部歌曲，请稍候~');
    pageNum.current = 1;
    const songItems = [];
    while (true) {
      const newData = await fetchSongsOrAlbums();
      console.log(`获取数据newData:${JSON.stringify(newData)}`);
      if (isEmpty(newData)) {
        break;
      } else {
        songItems.push(...newData);
        console.log(
          `一共歌曲数量：${songItems.length} newDatachangdu：${newData.length}`,
        );
      }
    }
    console.log(`一共歌曲数量：${songItems.length}`);
    const filterResult = songItems.filter(item => item.valid);
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
    navigation.navigate('正在播放');
  };

  return (
    <View style={styles.container}>
      {/* 歌手图片 */}
      <Image
        source={{ uri: singerImg }} // 替换为真实歌手图片路径
        style={styles.artistImage}
      />

      {/* 歌手名字 */}
      <Text style={styles.artistName}>{singerName}</Text>

      {/* 选项卡：歌曲 | 专辑 */}
      <View style={styles.optionContainer}>
        {['歌曲', '专辑'].map(option => (
          <TouchableOpacity
            key={option}
            style={[
              styles.optionButton,
              selectedOption === option && styles.activeOptionButton,
            ]}
            onPress={() => {
              if (option === selectedOption) {
                return;
              }
              setResults([]);
              hasMoreData.current = true;
              setSelectedOption(option);
            }}>
            <Text
              style={[
                styles.optionText,
                selectedOption === option && styles.activeOptionText,
              ]}>
              {option}
            </Text>
            <Icon
              name={option === '歌曲' ? 'music' : 'server'}
              size={iconSizes.small}
              color={
                selectedOption === option
                  ? colors.bgWhite
                  : colors.fontColorLightGray
              }
              style={{ marginLeft: 8 }}
            />
          </TouchableOpacity>
        ))}
      </View>

      {/* 如果是“歌曲”选项 */}
      {selectedOption === '歌曲' && (
        <SongList
          renderScenario="playList"
          songItems={results}
          loadMoreData={loadMoreData}
          hasMoreDownData={hasMoreData.current}
          playSongs={playSongs}
        />
      )}

      {/* 如果是“专辑”选项 */}
      {selectedOption === '专辑' && (
        <AlbumList
          navigation={navigation}
          albumItems={results}
          loadMoreData={loadMoreData}
          hasMoreDownData={hasMoreData.current}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  artistImage: {
    width: 150,
    height: 150,
    borderRadius: 75,
    alignSelf: 'center',
    //marginTop: 5,
    marginBottom: 10,
  },
  artistName: {
    fontSize: fontSizes.big,
    //fontWeight: 'bold',
    color: colors.fontColorDrakGray,
    textAlign: 'center',
    marginBottom: 10,
  },
  optionContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 10,
  },
  optionButton: {
    paddingVertical: filterButtonSmall.paddingVertical,
    paddingHorizontal: filterButtonSmall.paddingHorizontal,
    marginHorizontal: 15,
    borderRadius: filterButtonSmall.borderRadius,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgLightGray,
  },
  activeOptionButton: {
    backgroundColor: colors.bgBlue,
  },
  optionText: {
    fontSize: fontSizes.small,
    color: colors.fontColorDrakGray,
  },
  activeOptionText: {
    color: colors.bgWhite,
  },

  playAllButton: {
    backgroundColor: '#2196F3',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 10,
  },
  playAllButtonText: {
    color: '#FFF',
    fontSize: fontSizes.normal,
    fontWeight: 'bold',
  },

  downloadButtonText: {
    color: '#FFF',
    fontSize: fontSizes.small,
  },
  albumItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#DDD',
  },
  albumImage: {
    width: 60,
    height: 60,
    borderRadius: 5,
    marginRight: 10,
  },
  albumInfo: {
    flex: 1,
  },
  albumName: {
    fontSize: fontSizes.normal,
    //fontWeight: 'bold',
    color: '#333',
  },
  albumReleaseDate: {
    fontSize: fontSizes.small,
    color: '#666',
  },
});

export default SingerDetails;
