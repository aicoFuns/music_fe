import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  Modal,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
} from 'react-native';
import apiClient from './utils/ApiClient';
import MyUtils from './utils/MyUtils';
import { isEmpty } from 'lodash';
import { BlurView } from '@react-native-community/blur';
import ToastUtil from './utils/ToastUtil';
import Icon from 'react-native-vector-icons/FontAwesome6';
import { useIsFocused } from '@react-navigation/native';
import {
  colors,
  featureButtonNormal,
  filterButtonSmall,
  fontSizes,
  iconSizes,
} from './Common.styles';
import logUtil from './utils/LogUtil';

type PlayListType = 'CUSTOM' | 'THIRD_PLATFORM' | 'FAVORITE' | 'SOUND-ALBUM';
type PlayListDto = {
  id: number;
  type: PlayListType;
  playListName: string;
  playListImg: string;
  playListId: string;
  platform: string;
  userId: number;
  createTime: string;
  updateTime: string;
};
type VipType = 'Free' | 'Vip' | 'Purchse' | 'Svip';
type SoundAlbumDto = {
  platform: string;
  albumId: string;
  albumImg: string;
  albumTitle: string;
  countOfSounds: number;
  desc: string;
  vipType: VipType;
  isFinished: boolean;
  soundAlbumUpdateAt: string;
  userId: number;
  createTime: string;
};

const MyPlayList = ({ route, navigation }) => {
  const [selectedTab, setSelectedTab] = useState<PlayListType>('CUSTOM'); // 当前选中的类型：created 或 collected
  const [result, setResult] = useState<Array<PlayListDto>>([]);
  const [soundalbums, setSoundalbums] = useState<Array<SoundAlbumDto>>([]);
  const [isModalVisible, setModalVisible] = useState(false); // 控制模态框显示状态
  const [inputValue, setInputValue] = useState(''); // 存储输入框内容
  const [isEditing, setIsEditing] = useState(false);

  const isFocused = useIsFocused(); // 检测页面是否处于焦点状态
  const [key, setKey] = useState(0); // 用于强制刷新组件

  useEffect(() => {
    if (isFocused) {
      // 页面获得焦点时，触发重新渲染
      setKey(prevKey => prevKey + 1);
      setResult([]);
    }
  }, [isFocused]);

  // 显示模态框
  const openModal = () => {
    setModalVisible(true);
  };

  // 隐藏模态框
  const closeModal = () => {
    setModalVisible(false);
  };

  const getPlaylists = async () => {
    //console.log('请求获取播放列表');
    const response = (await apiClient.get(
      `/playlist/all/${selectedTab}`,
    )) as Array<PlayListDto>;
    //console.log(`获取结果：${JSON.stringify(response.data.result)}`);
    setResult(response.data.result);
  };

  const getSoundAlbumList = async () => {
    const response = (await apiClient.get(
      '/soundalbum/all',
    )) as Array<SoundAlbumDto>;
    setSoundalbums(response.data.result);
  };

  const handleConfirm = async () => {
    if (selectedTab === 'CUSTOM') {
      await apiClient.post('/playlist/create', {
        playListName: inputValue,
      });
      ToastUtil.showDefaultToast('创建歌单成功~');
      setInputValue('');
      getPlaylists();
      logUtil.info(`创建歌单：${inputValue}`, 'PLAYLIST');
    }
    if (selectedTab === 'THIRD_PLATFORM') {
      await apiClient.post('/playlist/import-songs', {
        url: inputValue,
      });
      ToastUtil.showDefaultToast('导入歌单成功~');
      setInputValue('');
      getPlaylists();
      logUtil.info(`导入歌单：${inputValue}`, 'PLAYLIST');
    }

    if (selectedTab === 'SOUND-ALBUM') {
      await apiClient.post('/soundalbum/import-sounds', {
        url: inputValue,
      });
      ToastUtil.showDefaultToast('导入声音专辑成功~');
      setInputValue('');
      getSoundAlbumList();
      logUtil.info(`导入声音专辑：${inputValue}`, 'SOUNDALBUM');
    }
  };

  useEffect(() => {
    getPlaylists();
    getSoundAlbumList();
  }, [selectedTab, key]);

  const handleDeletePlaylist = async deleteItem => {
    if (selectedTab === 'CUSTOM') {
      if (deleteItem.type === 'FAVORITE') {
        ToastUtil.showErrorToast('不允许删除红心歌单');
        return;
      }
      await apiClient.post('/playlist/delete', {
        id: deleteItem.id,
      });
      const newResult = result.filter(item => item.id !== deleteItem.id);
      setResult(newResult);
    }
    if (selectedTab === 'THIRD_PLATFORM') {
      await apiClient.post('/playlist/un-bookmark', {
        platform: deleteItem.platform,
        playListId: deleteItem.playListId.toString(),
      });
      const newResult = result.filter(item => item.id !== deleteItem.id);
      setResult(newResult);
    }

    if (selectedTab === 'SOUND-ALBUM') {
      const postBody = {
        platform: deleteItem.platform,
        albumId: String(deleteItem.albumId),
        albumImg: deleteItem.albumImg,
        albumTitle: deleteItem.albumTitle,
        countOfSounds: deleteItem.countOfSounds,
        desc: deleteItem.desc,
        vipType: deleteItem.vipType,
        isFinished: deleteItem.isFinished,
        soundAlbumUpdateAt: String(deleteItem.soundAlbumUpdateAt),
        releaseDate: deleteItem.releaseDate,
      };
      await apiClient.post('/soundalbum/un-bookmark', {
        ...postBody,
      });
      const newResult = soundalbums.filter(
        item => item.albumId !== deleteItem.albumId,
      );
      setSoundalbums(newResult);
    }

    ToastUtil.showDefaultToast('已删除');
    logUtil.info('删除歌单', 'PLAYLIST');
  };

  // 渲染歌单项
  const renderPlaylistItem: React.FC<{
    item: PlayListDto;
  }> = ({ item }) => (
    <TouchableOpacity
      disabled={isEditing}
      style={styles.playlistItem}
      onPress={() =>
        navigation.navigate('歌单详情', {
          playListItem: item,
        })
      }>
      <View style={styles.playListImgView}>
        <Image
          source={MyUtils.buildPlayListImg(item.playListImg, item.type)}
          style={styles.playlistImage}
        />
      </View>

      <View style={styles.playListDetailsView}>
        <View>
          <View style={styles.playListDetailsImgView}>
            {!isEmpty(item.platform) && (
              <Image
                source={MyUtils.buildPlatformImg(item.platform)}
                style={styles.playListPlatformImg}
              />
            )}

            <Text style={styles.playlistTitle} numberOfLines={1}>
              {item.playListName}
            </Text>
          </View>
          <Text style={styles.playlistDate}>
            {item.type === 'THIRD_PLATFORM' ? '收藏于 ' : '创建于 '}
            {MyUtils.formatDate(item.createTime)}
          </Text>
        </View>
        {isEditing && (
          <View style={styles.playListIconView}>
            <Icon
              name={item.type === 'FAVORITE' ? 'ban' : 'xmark'}
              color={
                item.type === 'FAVORITE'
                  ? colors.fontColorDrakGray
                  : colors.fontColorRed
              }
              size={20}
              onPress={() => {
                handleDeletePlaylist(item);
              }}
            />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

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

  // 渲染声音专辑项
  const renderSoundAlbumItem: React.FC<{
    item: SoundAlbumDto;
  }> = ({ item }) => (
    <TouchableOpacity
      disabled={isEditing}
      style={styles.playlistItem}
      onPress={() =>
        navigation.navigate('声音专辑', {
          item,
        })
      }>
      <View style={styles.playListImgView}>
        <Image source={{ uri: item.albumImg }} style={styles.playlistImage} />
      </View>

      <View style={styles.playListDetailsView}>
        <View>
          <View style={styles.playListDetailsImgView}>
            {!isEmpty(item.platform) && (
              <Image
                source={MyUtils.buildPlatformImg(item.platform)}
                style={styles.playListPlatformImg}
              />
            )}

            <Text style={styles.playlistTitle} numberOfLines={1}>
              {item.albumTitle}
            </Text>
          </View>
          <View style={{ flexDirection: 'row' }}>
            <Text style={styles.playlistDate}>{buildVipTypeDesc(item)}</Text>
            <Text style={styles.playlistDate}>
              {`收藏于 ${MyUtils.formatDate(item.createTime)}`}
            </Text>
          </View>
        </View>
        {isEditing && (
          <View style={styles.playListIconView}>
            <Icon
              name={item.type === 'FAVORITE' ? 'ban' : 'xmark'}
              color={
                item.type === 'FAVORITE'
                  ? colors.fontColorDrakGray
                  : colors.fontColorRed
              }
              size={20}
              onPress={() => {
                handleDeletePlaylist(item);
              }}
            />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* 顶部选项卡 */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          disabled={isEditing}
          style={[
            styles.tabButton,
            selectedTab === 'CUSTOM' && styles.activeTab,
            isEditing ? styles.disableButton : styles.enableButton,
          ]}
          onPress={() => setSelectedTab('CUSTOM')}>
          <Text
            style={[
              styles.tabText,
              selectedTab === 'CUSTOM' && styles.activeTabText,
            ]}>
            私人歌单
          </Text>
          <Icon
            name="user-large"
            size={iconSizes.normal}
            color={
              selectedTab === 'CUSTOM'
                ? colors.fontColorWhite
                : colors.fontColorLightGray
            }
            style={styles.tabButtonIcon}
          />
        </TouchableOpacity>
        <TouchableOpacity
          disabled={isEditing}
          style={[
            styles.tabButton,
            selectedTab === 'THIRD_PLATFORM' && styles.activeTab,
            isEditing ? styles.disableButton : styles.enableButton,
          ]}
          onPress={() => setSelectedTab('THIRD_PLATFORM')}>
          <Text
            style={[
              styles.tabText,
              selectedTab === 'THIRD_PLATFORM' && styles.activeTabText,
            ]}>
            网络歌单
          </Text>
          <Icon
            name="cloud"
            solid={true}
            size={iconSizes.normal}
            color={
              selectedTab === 'THIRD_PLATFORM'
                ? colors.fontColorWhite
                : colors.fontColorLightGray
            }
            style={styles.tabButtonIcon}
          />
        </TouchableOpacity>
        <TouchableOpacity
          disabled={isEditing}
          style={[
            styles.tabButton,
            selectedTab === 'SOUND-ALBUM' && styles.activeTab,
            isEditing ? styles.disableButton : styles.enableButton,
          ]}
          onPress={() => setSelectedTab('SOUND-ALBUM')}>
          <Text
            style={[
              styles.tabText,
              selectedTab === 'SOUND-ALBUM' && styles.activeTabText,
            ]}>
            声音专辑
          </Text>
          <Icon
            name="book"
            solid={true}
            size={iconSizes.normal}
            color={
              selectedTab === 'SOUND-ALBUM'
                ? colors.fontColorWhite
                : colors.fontColorLightGray
            }
            style={styles.tabButtonIcon}
          />
        </TouchableOpacity>
      </View>

      {/* 歌单列表 */}
      {selectedTab !== 'SOUND-ALBUM' && (
        <FlatList
          data={result}
          keyExtractor={item => item.id.toString()}
          renderItem={renderPlaylistItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}

      {selectedTab === 'SOUND-ALBUM' && (
        <FlatList
          data={soundalbums}
          keyExtractor={item => item.id.toString()}
          renderItem={renderSoundAlbumItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* 创建歌单按钮，仅在“我创建的歌单”页面显示 */}
      {selectedTab === 'CUSTOM' && (
        <View style={styles.customButtonView}>
          <TouchableOpacity
            disabled={isEditing}
            style={[
              styles.playListButton,
              isEditing ? styles.disableButton : styles.enableButton,
            ]}
            onPress={openModal}>
            <Text style={styles.playListButtonText}>创建歌单</Text>
            <Icon
              name="plus"
              size={iconSizes.normal}
              color={colors.bgWhite}
              style={styles.playListButtonIcon}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.playListButton}
            onPress={() => {
              setIsEditing(!isEditing);
            }}>
            <Text style={styles.playListButtonText}>
              {isEditing ? '退出管理' : '管理歌单'}
            </Text>
            <Icon
              name={isEditing ? 'right-from-bracket' : 'wrench'}
              size={iconSizes.normal}
              color={colors.bgWhite}
              style={styles.playListButtonIcon}
            />
          </TouchableOpacity>
        </View>
      )}

      {/* 创建歌单按钮，仅在“我创建的歌单”页面显示 */}
      {selectedTab === 'THIRD_PLATFORM' && (
        <View style={styles.customButtonView}>
          <TouchableOpacity
            disabled={isEditing}
            style={[
              styles.playListButton,
              isEditing ? styles.disableButton : styles.enableButton,
            ]}
            onPress={openModal}>
            <Text style={styles.playListButtonText}>导入歌单</Text>
            <Icon
              name="plus"
              size={iconSizes.normal}
              color={colors.bgWhite}
              style={styles.playListButtonIcon}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.playListButton}
            onPress={() => {
              setIsEditing(!isEditing);
            }}>
            <Text style={styles.playListButtonText}>
              {isEditing ? '退出管理' : '管理歌单'}
            </Text>
            <Icon
              name={isEditing ? 'right-from-bracket' : 'wrench'}
              size={iconSizes.normal}
              color={colors.bgWhite}
              style={styles.playListButtonIcon}
            />
          </TouchableOpacity>
        </View>
      )}

      {selectedTab === 'SOUND-ALBUM' && (
        <View style={styles.customButtonView}>
          <TouchableOpacity
            disabled={isEditing}
            style={[
              styles.playListButton,
              isEditing ? styles.disableButton : styles.enableButton,
            ]}
            onPress={openModal}>
            <Text style={styles.playListButtonText}>导入专辑</Text>
            <Icon
              name="plus"
              size={iconSizes.normal}
              color={colors.bgWhite}
              style={styles.playListButtonIcon}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.playListButton}
            onPress={() => {
              setIsEditing(!isEditing);
            }}>
            <Text style={styles.playListButtonText}>
              {isEditing ? '退出管理' : '管理专辑'}
            </Text>
            <Icon
              name={isEditing ? 'right-from-bracket' : 'wrench'}
              size={iconSizes.normal}
              color={colors.bgWhite}
              style={styles.playListButtonIcon}
            />
          </TouchableOpacity>
        </View>
      )}

      {isModalVisible && (
        <BlurView
          style={modalStyles.blurView}
          blurType="light" // 模糊类型：light, dark, or extra-dark
          blurAmount={5} // 模糊程度
          reducedTransparencyFallbackColor="white" // 不支持模糊时的背景颜色
        />
      )}
      {/* 模态框 */}
      {/* 模态框 */}
      <Modal
        visible={isModalVisible}
        transparent={true} // 设置背景透明
        animationType="slide" // 动画效果
        onBackdropPress={closeModal} // 点击模糊部分关闭新页面
        onBackButtonPress={closeModal}
        onRequestClose={closeModal}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={modalStyles.modalOverlay}>
            <View style={modalStyles.modalContent}>
              {/* 文本框 */}
              <Text style={modalStyles.modalTitle}>
                {selectedTab === 'CUSTOM'
                  ? '创建歌单'
                  : selectedTab === 'THIRD_PLATFORM'
                  ? '请输入歌单分享链接'
                  : '请输入声音专辑分享链接'}
              </Text>

              {/* 输入框 */}
              <TextInput
                style={modalStyles.input}
                placeholder={
                  selectedTab === 'CUSTOM'
                    ? '请输入歌单名称，长度2-10'
                    : selectedTab === 'THIRD_PLATFORM'
                    ? '支持QQ和网易云，可自动识别~'
                    : '支持手机端喜马拉雅分享链接~'
                }
                placeholderTextColor={colors.fontColorVeryLightGray}
                value={inputValue}
                onChangeText={setInputValue}
              />

              {/* 确认按钮 */}
              <TouchableOpacity
                style={modalStyles.confirmButton}
                onPress={() => {
                  handleConfirm();
                  closeModal(); // 关闭模态框
                }}>
                <Text style={modalStyles.confirmButtonText}>确认</Text>
                <Icon
                  name="check"
                  size={iconSizes.normal}
                  color={colors.bgWhite}
                  style={modalStyles.confirmButtonIcon}
                />
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

const modalStyles = StyleSheet.create({
  blurView: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  button: {
    backgroundColor: '#007bff',
    padding: 15,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: fontSizes.normal,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // 半透明背景
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    backgroundColor: colors.bgWhite,
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    elevation: 5, // 添加阴影效果
  },
  modalTitle: {
    fontSize: fontSizes.big,
    fontWeight: 'bold',
    marginBottom: 20,
    color: colors.fontColorLightGray,
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: colors.bgBlue,
    borderRadius: 5,
    padding: 10,
    marginBottom: 20,
    color: colors.fontColorDrakGray,
  },
  confirmButton: {
    backgroundColor: colors.bgBlue,
    paddingVertical: featureButtonNormal.paddingVertical,
    paddingHorizontal: featureButtonNormal.paddingHorizontal,
    borderRadius: featureButtonNormal.borderRadius,
    flexDirection: 'row',
    alignItems: 'center',
  },
  confirmButtonText: {
    color: colors.fontColorWhite,
    fontSize: fontSizes.normal,
  },
  confirmButtonIcon: {
    marginLeft: 8,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    backgroundColor: colors.bgWhite,
    borderBottomWidth: 1,
    borderColor: colors.bgLightGray,
  },
  tabButton: {
    paddingVertical: filterButtonSmall.paddingVertical,
    paddingHorizontal: filterButtonSmall.paddingHorizontal,
    borderRadius: filterButtonSmall.borderRadius,
    backgroundColor: colors.bgLightGray,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabButtonIcon: { marginLeft: 4 },
  activeTab: {
    backgroundColor: '#007BFF',
  },
  tabText: {
    fontSize: fontSizes.small,
    color: colors.fontColorDrakGray,
  },
  activeTabText: {
    color: '#FFFFFF',
    //fontWeight: 'bold',
  },
  listContainer: {
    //flex: 1,
    paddingHorizontal: 10,
    paddingBottom: 20, // 为按钮留出空间
  },
  playlistItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderColor: '#E0E0E0',
    padding: 10,
  },
  playListImgView: { flex: 2, alignItems: 'center', justifyContent: 'center' },
  playlistImage: {
    width: 50,
    height: 50,
    borderRadius: 5,
    marginRight: 10,
    flexShrink: 1,
  },
  playListDetailsView: {
    flex: 9,
    flexDirection: 'row',
    alignItems: 'center',
  },
  playListDetailsImgView: { flexDirection: 'row' },
  playListPlatformImg: {
    //flex: 1,
    height: 20,
    width: 20,
    marginRight: 5,
    marginTop: 1,
  },
  playlistInfo: {
    flex: 1,
  },
  playlistTitle: {
    paddingRight: 30,
    //flex: 9,
    fontSize: fontSizes.normal,
    //fontWeight: 'bold',
    color: '#333',
    width: '85%',
    //flexShrink: 1,
  },
  playlistDate: {
    fontSize: fontSizes.small,
    color: '#666',
    marginTop: 5,
    marginRight: 5,
    //flexShrink: 1,
  },
  playListIconView: { flex: 1, alignItems: 'flex-end' },

  customButtonView: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  playListButton: {
    backgroundColor: colors.bgBlue,
    paddingVertical: featureButtonNormal.paddingVertical,
    paddingHorizontal: featureButtonNormal.paddingHorizontal,
    marginHorizontal: 10,
    borderRadius: featureButtonNormal.borderRadius,
    alignItems: 'center',
    flexDirection: 'row',
  },
  disableButton: {
    opacity: 0.6,
  },
  enableButton: {
    opacity: 1,
  },
  playListButtonText: {
    color: '#FFFFFF',
    fontSize: fontSizes.normal,
    //fontWeight: 'bold',
  },
  playListButtonIcon: { marginLeft: 5 },
});

export default MyPlayList;
