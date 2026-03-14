import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  StyleSheet,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome6';
import SongList from './SongList';
import _, { isEmpty } from 'lodash';
import apiClient from './utils/ApiClient';
import ToastUtil from './utils/ToastUtil';
import MyUtils from './utils/MyUtils';
import {
  colors,
  featureButtonBig,
  filterButtonVerySmall,
  fontSizes,
  iconSizes,
} from './Common.styles';
import { EmptyList, Footer } from './FlatListComponent';
import logUtil from './utils/LogUtil';

const SearchList = ({ route, navigation }) => {
  type SearchType = 'music' | 'singer' | 'playList' | 'sound-album';
  const [activeOption, setActiveOption] = useState<SearchType>('music'); // 当前选中的过滤选项
  const [results, setResults] = useState([]); // 搜索结果
  const [keyWord, setKeyWord] = useState(route.params.keyWord);
  const inputRef = useRef(null);
  const pageNum = useRef(1);

  // 获取播放队列的函数
  const fetchSongs = async () => {
    if (_.isEmpty(keyWord)) {
      ToastUtil.showErrorToast('请输入搜索关键字');
      return;
    }
    // console.log(
    //   `fetchSongs调用，当前pageNum:${pageNum.current} activeOption:${activeOption}`,
    // );
    const response = await apiClient.get(
      `/search/${activeOption}/${keyWord}?pageNum=${pageNum.current++}`,
    );
    logUtil.info(`搜索类型：${activeOption} 关键字：${keyWord}`, 'SEARCH');
    return response.data.result;
  };

  const handleSearch = async () => {
    pageNum.current = 1;
    const fetchResult = await fetchSongs();
    setResults(fetchResult);
  };

  // 在组件加载时调用 fetchSongs
  useEffect(() => {
    pageNum.current = 1;
    const updateResult = async () => {
      const fetchResult = await fetchSongs();
      setResults(fetchResult);
    };
    console.log('更新搜索结果，导致search list重新渲染...');
    updateResult();
  }, [activeOption]);

  //const [isLoading, setIsLoading] = useState(false);
  const hasMoreDownData = useRef(true);
  // 加载更多数据逻辑
  const loadMoreData = async direction => {
    if (direction === 'up') {
      return;
    }
    if (direction === 'down' && !hasMoreDownData.current) {
      //console.log('没有更多数据了，不再触发...');
      // ToastUtil.showDefaultToast('没有更多数据了...');
      return;
    }

    //setIsLoading(true);
    // console.log('在SearchList中执行loadMoreData...');
    //ToastUtil.showDefaultToast('加载下一页数据...');

    if (direction === 'down') {
      // 向下加载：在尾部追加数据
      const newData = await fetchSongs();
      if (isEmpty(newData)) {
        console.log('没有更多的数据了');
        hasMoreDownData.current = false;
      }
      setResults(prevData => [...prevData, ...newData]);
    }
  };

  const buildDesc = item => {
    //console.log(`item详情：${JSON.stringify(item)}`);
    if (activeOption === 'playList') {
      return `${item.countOfSong}首歌曲`;
    }
    if (activeOption === 'singer') {
      if (item.countOfSong == null) {
        //console.log('命中isEmpty:' + item.countOfSong);
        return `${item.countOfAlbum}张专辑`;
      } else {
        //console.log('没有命中isEmpty');
        return `${item.countOfAlbum}张专辑 ${item.countOfSong}首歌曲`;
      }
    }
    if (activeOption === 'sound-album') {
      return `${item.countOfSounds}个声音`;
    }
  };

  const buildVipTypeDesc = item => {
    if (isEmpty(item)) {
      return '';
    }
    let vipDesc;
    if (item.vipType === 'Free') {
      vipDesc = '免费';
    } else {
      vipDesc = '付费';
    }
    let finishDesc;
    if (item.isFinished) {
      finishDesc = '完结';
    } else {
      finishDesc = '连载';
    }

    return `${vipDesc}/${finishDesc}`;
  };

  const [searchButtonHeight, setSearchButtonHeight] = React.useState('80%');

  const handleSearchButtonLayout = event => {
    if (searchButtonHeight === '80%') {
      setSearchButtonHeight(event.nativeEvent.layout.height);
    }
  };

  // 渲染搜索结果
  const renderResult = ({ item }) => {
    return (
      <TouchableOpacity
        onPress={() => {
          if (activeOption === 'singer') {
            navigation.navigate('歌手详情', { item });
          }
          if (activeOption === 'playList') {
            navigation.navigate('歌单详情', {
              playListItem: item,
            });
          }
          if (activeOption === 'sound-album') {
            navigation.navigate('声音专辑', {
              item,
            });
          }
        }}>
        <View style={styles.artistOrPlaylistItem}>
          <Image
            source={{
              uri:
                activeOption === 'playList'
                  ? item.playListImg
                  : activeOption === 'singer'
                  ? item.singerImg
                  : item.albumImg,
            }}
            style={styles.artistOrPlaylistImage}
          />
          <View style={styles.artistOrPlaylistInfo}>
            <View style={styles.artistOrPlaylistImgAndName}>
              <Image
                source={MyUtils.buildPlatformImg(item.platform)}
                style={styles.artistOrPlaylistImg}
              />
              <Text style={styles.artistOrPlaylistName} numberOfLines={1}>
                {activeOption === 'playList'
                  ? item.playListName
                  : activeOption === 'singer'
                  ? item.singerName
                  : item.albumTitle}
              </Text>
            </View>
            <View style={{ flexDirection: 'row' }}>
              {activeOption === 'sound-album' && (
                <Text style={styles.artistOrPlaylistDescription}>
                  {buildVipTypeDesc(item)}
                </Text>
              )}
              {/* {activeOption === 'sound-album' && (
                <Text style={styles.artistOrPlaylistDescription}>
                  {item.isFinished ? '完结' : '连载'}
                </Text>
              )} */}

              <Text style={styles.artistOrPlaylistDescription}>
                {buildDesc(item)}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* 搜索区域 */}
      <View style={styles.searchArea}>
        <TextInput
          style={[styles.searchInput, { height: searchButtonHeight }]}
          ref={inputRef}
          placeholder="搜索你喜欢的音乐或声音~"
          value={keyWord}
          onChangeText={setKeyWord}
        />
        <TouchableOpacity
          style={styles.searchButton}
          onPress={handleSearch}
          onLayout={handleSearchButtonLayout}>
          <Text style={styles.searchButtonText}>搜索</Text>
          <Icon
            name="magnifying-glass"
            size={iconSizes.normal}
            color={colors.bgWhite}
            style={styles.searchIcon}
          />
        </TouchableOpacity>
      </View>

      {/* 过滤选项区域 */}
      <View style={styles.filterOptions}>
        {['music', 'singer', 'playList', 'sound-album'].map(option => (
          <TouchableOpacity
            key={option}
            style={[
              styles.filterOption,
              activeOption === option && styles.activeFilterOption,
            ]}
            onPress={() => {
              setResults([]);
              hasMoreDownData.current = true;
              setActiveOption(option);
            }}>
            <Text
              style={[
                styles.filterOptionText,
                activeOption === option && styles.activeFilterOptionText,
              ]}>
              {option === 'music'
                ? '歌曲'
                : option === 'singer'
                ? '歌手'
                : option === 'playList'
                ? '歌单'
                : '有声书'}
            </Text>
            {/* <Icon
              name={
                option === 'music'
                  ? 'music'
                  : option === 'singer'
                  ? 'user-tie'
                  : 'list'
              }
              size={iconSizes.normal}
              color={
                activeOption === option
                  ? colors.bgWhite
                  : colors.fontColorLightGray
              }
              style={styles.filterOptionIcon}
            /> */}
          </TouchableOpacity>
        ))}
      </View>

      {activeOption === 'music' ? (
        <SongList
          renderScenario="searchResult"
          songItems={results}
          loadMoreData={loadMoreData}
          hasMoreDownData={hasMoreDownData.current}
        />
      ) : (
        ''
      )}
      {activeOption === 'singer' ||
      activeOption === 'playList' ||
      activeOption === 'sound-album' ? (
        <FlatList
          data={results}
          keyExtractor={(item, index) => {
            // console.log(
            //   `准备为item生成key，index:${index} activeOption:${activeOption} platform:${item.platform} singerId:${item.singerId} playListId:${item.playListId} results.length:${results.length}`,
            // );
            let result;
            if (activeOption === 'singer') {
              result = `${item.platform}-${item.singerId?.toString()}`;
            }
            if (activeOption === 'playList') {
              result = `${item.platform}-${item.playListId?.toString()}`;
            }
            if (activeOption === 'sound-album') {
              result = `${item.platform}-${item.albumId?.toString()}`;
            }

            return result;
          }}
          renderItem={renderResult}
          contentContainerStyle={styles.resultsContainer}
          onEndReached={() => {
            //console.log('触发down加载事件');
            if (isEmpty(results)) {
              //console.log('空结果触发，所以不执行');
              return;
            }
            loadMoreData('down');
          }} // 滑到底部加载更多
          onEndReachedThreshold={0.1} // 接近底部时触发加载
          maxToRenderPerBatch={10} // 每次渲染的最大数量
          updateCellsBatchingPeriod={50} // 批量更新的时间间隔（毫秒）
          windowSize={15} // 可见窗口的大小
          ListFooterComponent={
            !hasMoreDownData.current && !isEmpty(results) ? <Footer /> : null
          }
          ListEmptyComponent={<EmptyList />}
        />
      ) : (
        ''
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgWhite,
  },
  searchArea: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    //borderBottomWidth: 1,
    //borderBottomColor: colors.bgLightGray,
    width: '90%',
    alignSelf: 'center',
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.bgBlue, // 边框颜色为蓝色
    borderBottomLeftRadius: 5,
    borderTopLeftRadius: 5,
    paddingHorizontal: 10,
    color: colors.fontColorDrakGray,
    //marginRight: 10, // 和按钮之间的间距
  },
  searchButton: {
    backgroundColor: colors.bgBlue,
    paddingVertical: featureButtonBig.paddingVertical,
    paddingHorizontal: featureButtonBig.paddingHorizontal,
    borderRadius: featureButtonBig.borderRadius,
    borderBottomLeftRadius: 0,
    borderTopLeftRadius: 0,

    flexDirection: 'row',
    alignItems: 'center',
  },
  searchIcon: { marginLeft: 5 },
  searchButtonText: {
    color: colors.bgWhite,
    fontSize: fontSizes.normal,
    textAlign: 'center',
  },
  filterOptions: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    paddingBottom: 10,
    //  paddingVertical: 5,

    borderBottomWidth: 1,
    borderBottomColor: colors.bgLightGray,
  },
  filterOption: {
    paddingHorizontal: filterButtonVerySmall.paddingHorizontal,
    paddingVertical: filterButtonVerySmall.paddingVertical,
    borderRadius: filterButtonVerySmall.borderRadius,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgLightGray,
  },
  activeFilterOption: {
    backgroundColor: colors.bgBlue,
  },
  filterOptionText: {
    fontSize: fontSizes.small,
    color: colors.fontColorLightGray,
  },
  filterOptionIcon: {
    marginLeft: 5,
  },
  activeFilterOptionText: {
    color: colors.bgWhite,
  },
  resultsContainer: {
    flexGrow: 1,
    padding: 10,
  },
  songItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    marginBottom: 10,
    borderRadius: 5,
    elevation: 2,
  },
  artistOrPlaylistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.bgLightGray,
  },
  artistOrPlaylistImage: {
    width: 60,
    height: 60,
    borderRadius: 5,
    marginRight: 10,
  },
  artistOrPlaylistInfo: {
    flex: 1,
  },
  artistOrPlaylistImgAndName: {
    flexDirection: 'row',
  },
  artistOrPlaylistImg: { height: 20, width: 20, marginRight: 5, marginTop: 1 },
  artistOrPlaylistName: {
    fontSize: fontSizes.normal,
    fontWeight: 'bold',
    color: colors.fontColorDrakGray,
  },
  artistOrPlaylistDescription: {
    fontSize: fontSizes.small,
    color: colors.fontColorLightGray,
    marginRight: 5,
  },
});

export default SearchList;
