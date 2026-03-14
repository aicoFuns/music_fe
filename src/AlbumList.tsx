import {
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import React from 'react';
import { isEmpty } from 'lodash';
import { EmptyList, Footer } from './FlatListComponent';
import { fontSizes } from './Common.styles';

export default function AlbumList({
  navigation,
  albumItems,
  loadMoreData,
  hasMoreDownData = true,
}) {
  console.log(`albumItems=${albumItems}`);
  //const albumItemsRef = useRef(albumItems);
  // 渲染专辑列表
  const renderAlbum = ({ item }) => (
    <TouchableOpacity
      onPress={() => navigation.navigate('专辑详情', { albumItem: item })}>
      <View style={styles.albumItem}>
        <Image source={{ uri: item.albumImg }} style={styles.albumImage} />
        <View style={styles.albumInfo}>
          <Text style={styles.albumName}>{item.albumTitle}</Text>
          <Text style={styles.albumReleaseDate}>{item.releaseDate}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <FlatList
      data={albumItems}
      keyExtractor={item => `${item.platform}${item.albumId}`}
      renderItem={renderAlbum}
      contentContainerStyle={styles.listContainer}
      onEndReached={() => {
        if (isEmpty(albumItems)) {
          console.log('空Alums列表触发，不执行');
          return;
        }
        loadMoreData();
      }}
      onEndReachedThreshold={0.1} // 接近底部时触发加载
      maxToRenderPerBatch={10} // 每次渲染的最大数量
      updateCellsBatchingPeriod={50} // 批量更新的时间间隔（毫秒）
      windowSize={15} // 可见窗口的大小
      ListFooterComponent={
        !hasMoreDownData && !isEmpty(albumItems) ? <Footer /> : null
      }
      ListEmptyComponent={<EmptyList />}
    />
  );
}

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
    marginTop: 5,
    marginBottom: 10,
  },
  artistName: {
    fontSize: fontSizes.big,
    //fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 10,
  },
  optionContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 10,
  },
  optionButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginHorizontal: 5,
    borderRadius: 20,
    backgroundColor: '#E0E0E0',
  },
  activeOptionButton: {
    backgroundColor: '#2196F3',
  },
  optionText: {
    fontSize: fontSizes.normal,
    color: '#666',
  },
  activeOptionText: {
    color: '#FFF',
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
  listContainer: {
    paddingHorizontal: 20,
  },
});
