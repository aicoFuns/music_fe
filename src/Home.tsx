// In App.js in a new project

import * as React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  Image,
  StyleSheet,
  Platform,
} from 'react-native';
import { NavigationContainer, useFocusEffect } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MyHeader from './Header';
import SearchHistoryList from './SearchHistoryList';
import SmallPlayer from './SmallPlayer';
import MainPlayer from './MainPlayer';
import { useEffect, useState } from 'react';
import Icon from 'react-native-vector-icons/FontAwesome6';
import SearchList from './SearchList';
import SingerDetails from './SingerDetails';
import AlumDetails from './AlbumDetails';
import Account from './Accout';
import MyPlayList from './MyPlayList';
import { useAuthStore } from './global/useAuthStore';
import apiClient, { initializeAxios } from './utils/ApiClient';
import useSearchHistoryStore from './global/useSearchHistoryStore';
import _, { isEmpty } from 'lodash';
import ToastUtil from './utils/ToastUtil';
import PlaylistDetails from './PlaylistDetails';
import usePlaylistStore from './global/usePlaylistStore';
import playerCore, { initTrackPlayer } from './playerCore';
import { useMyTrackPlayerEvents } from './useMyTrackPlayerEvents';
import {
  colors,
  commonStyles,
  defaultView,
  featureButtonBig,
  featureButtonNormal,
  fontSizes,
  iconSizes,
} from './Common.styles';
import { ParameterConstant } from './ParameterConstant';
import _updateConfig from '../update.json';
import { PushyProvider, Pushy, usePushy } from 'react-native-update';
import { BlurView } from '@react-native-community/blur';
import logUtil from './utils/LogUtil';
import useDownloadListStore from './global/useDownloadListStore';
import DownloadList from './DownloadList';
import downloadCore from './downloadCore';
import SoundAlbumDetails from './SoundAlbumDetails';

const { appKey } = _updateConfig[Platform.OS];

type UserMsg = {
  id: number;
  targetUserIds: string;
  msgType: string;
  msgTitle: string;
  msgContent: string;
  createTime: Date;
};

// 唯一必填参数是appKey，其他选项请参阅 api 文档
const pushyClient = new Pushy({
  appKey,
  // 注意，默认情况下，在开发环境中不会检查更新
  // 如需在开发环境中调试更新，请设置debug为true
  // 但即便打开此选项，也仅能检查、下载热更，并不能实际应用热更。实际应用热更必须在release包中进行。
  checkStrategy: 'both',
  updateStrategy: null,
  debug: true,
});

function MusicPlayerScreen({ route, navigation }) {
  return <MainPlayer route={route} navigation={navigation} />;
}

function SearchScreen({ route, navigation }) {
  return <SearchList route={route} navigation={navigation} />;
}

function AccountScreen({ route, navigation }) {
  return <Account route={route} navigation={navigation} />;
}

function AlumDetailsScreen({ route, navigation }) {
  return <AlumDetails route={route} navigation={navigation} />;
}
function PlaylistDetailsScreen({ route, navigation }) {
  return <PlaylistDetails route={route} navigation={navigation} />;
}

function MyPlayListScreen({ route, navigation }) {
  return <MyPlayList route={route} navigation={navigation} />;
}

function DownloadListScreen({ route, navigation }) {
  return <DownloadList route={route} navigation={navigation} />;
}

function SoundAlbumDetailsScreen({ route, navigation }) {
  return <SoundAlbumDetails route={route} navigation={navigation} />;
}

function SingerDetailsScreen({ route, navigation }) {
  return <SingerDetails route={route} navigation={navigation} />;
}

function HomeScreen({ navigation }) {
  const {
    client,
    checkUpdate,
    downloadUpdate,
    downloadAndInstallApk,
    switchVersionLater,
    getCurrentVersionInfo,
    switchVersion,
    updateInfo,
    packageVersion,
    currentHash,
    progress: { received, total } = {},
    lastError,
  } = usePushy();

  // const loginUser = useAuthStore(state => state.loginedUser);
  // console.log(`渲染Home,loginUser:${JSON.stringify(loginUser)}`);

  // const [ignoreUpdate, setIgnoreUpdate] = useState(false);
  // useEffect(() => {
  //   const noNeedUpdate =
  //     (!isEmpty(updateInfo) && !updateInfo?.update && !updateInfo?.expired) ||
  //     ignoreUpdate;

  //   if (!isModalVisible && isEmpty(loginUser) && noNeedUpdate) {
  //     //console.log(`准备跳转,updateInfo${JSON.stringify(updateInfo)}`);
  //     navigation.navigate('我的账号');
  //   }
  // }, [ignoreUpdate, isModalVisible, loginUser, updateInfo]);

  const keyWordRef = React.useRef('');
  const inputRef = React.useRef(null);
  const userMsgs = React.useRef<Array<UserMsg>>([]);
  const currentShowMsg = React.useRef<UserMsg>(undefined);
  const readUserMsgIds = useAuthStore(state => state.readUserMsgIds);
  // const [user, setUser] = useState(undefined);
  const loginedUser = useAuthStore(state => state.loginedUser);
  useMyTrackPlayerEvents();

  const updateUserInfo = async () => {
    const currentUserResponse = await apiClient.get('/user/currentUserInfo');
    const currentUser = currentUserResponse.data.result;
    console.log(`获取到CurrentUserInfo：${JSON.stringify(currentUser)}`);
    if (!_.isEqual(loginedUser, currentUser)) {
      console.log('当前loginedUser不相等，需要set赋值~');
      // setUser(currentUser);
      useAuthStore.getState().setUser(currentUser);
    }
  };

  const [timeSeconds, setTimeSeconds] = useState(5);
  const updateUserMsg = async () => {
    const userMsgResponse = await apiClient.get('/utils/user-msg');
    const userMsgResult = userMsgResponse.data.result;
    //console.log(`获取到userMsgs：${JSON.stringify(userMsgResult)}`);
    if (_.isEmpty(userMsgResult)) {
      return;
    }
    userMsgs.current = userMsgResult;
  };

  useFocusEffect(() => {
    const loginedUser = useAuthStore.getState().loginedUser;
    console.log(`获取到当前loginedUser：${JSON.stringify(loginedUser)}`);
    if (isEmpty(loginedUser)) {
      return;
    }
    updateUserInfo();
    updateUserMsg();
    setTimeout(() => {
      checkUserMsg();
    }, 500);
  });

  const checkUserMsg = () => {
    if (isMsgModalVisible) {
      console.log('当前已经有消息正在展示，无需检测~');
      return;
    }
    for (const userMsg of userMsgs.current) {
      if (readUserMsgIds.includes(userMsg.id)) {
        console.log(
          `获取到readUserMsgIds：${JSON.stringify(
            readUserMsgIds,
          )} 当前userMsgId:${userMsg.id}`,
        );
        // 这个已读
        continue;
      }
      currentShowMsg.current = userMsg;
      console.log('存在未读消息，设置modal为true');
      setMsgModalVisible(true);
      setTimeSeconds(5);
      return;
    }
  };

  useEffect(() => {
    let timeIntervalId;

    if (timeSeconds > 0) {
      timeIntervalId = setInterval(() => {
        console.log(`正在执行定时器，此时的timeSeconds：${timeSeconds}~`);
        setTimeSeconds(prevTime => {
          const newTime = prevTime - 1;
          if (newTime === 0) {
            console.log('清除定时器~');
            clearInterval(timeIntervalId);
          }
          return newTime;
        });
      }, 1000);
    }

    // 清理定时器，当组件卸载或timeSeconds变化时
    return () => clearInterval(timeIntervalId);
  }, [timeSeconds]); // 依赖timeSeconds，只有它变化时才会触发effect

  // useEffect(() => {
  //   checkUserMsg();
  // }, [readUserMsgIds, userMsgs.current]);

  const setUserMsgRead = userMsgId => {
    useAuthStore.getState().updateReadUserMsgIds(userMsgId);
    setMsgModalVisible(false);
  };

  useEffect(() => {
    usePlaylistStore.getState().updateCurrentPlay({ isPlaying: false });
    const songItem = usePlaylistStore.getState().currentPlay.songItem;
    const playList = usePlaylistStore.getState().playList;
    if (
      !isEmpty(songItem) &&
      !playList.some(
        item =>
          item.platform === songItem.platform &&
          item.songId === songItem.songId,
      )
    ) {
      usePlaylistStore.getState().updateCurrentPlay({
        isPlaying: false,
        songItem: null,
        playIndex: 0,
        playDuration: 0,
        playPosition: 0,
        planStopAt: undefined,
      });
    } else {
      // console.log(
      //   `初始化播放器时，当前播放歌曲：${songItem?.songTitle}存在于列表中，不需要删除`,
      // );
      usePlaylistStore
        .getState()
        .updateCurrentPlay({ isPlaying: false, planStopAt: undefined });
      // const initTrackerPlayInfo = async () => {
      //   // await TrackPlayer.reset();
      //   // await TrackPlayer.add({
      //   //   ...songItem,
      //   //   title: songItem.songTitle,
      //   //   artist: songItem.singerName,
      //   //   artwork: songItem.songImg,
      //   // });
      //   console.log('加载歌曲信息到队列完毕');
      //   // await TrackPlayer.seekTo(
      //   //   usePlaylistStore.getState().currentPlay.playPosition as number,
      //   // );
      // };
      // initTrackerPlayInfo();
    }
    // console.log(
    //   `the traker player init successful, the currentPlay data：${JSON.stringify(
    //     usePlaylistStore.getState().currentPlay,
    //   )}`,
    // );
    // console.log(
    //   `the traker player init successful, the palylist length: ${
    //     usePlaylistStore.getState().playList.length
    //   }`,
    // );
  }, []);

  const handleClickHistory = (historyKeyWord: string) => {
    keyWordRef.current = historyKeyWord;
    search();
  };

  const search = () => {
    // console.log('_.isEmpty(keyWordRef.current)--' + keyWordRef.current);
    if (_.isEmpty(keyWordRef.current)) {
      ToastUtil.showErrorToast('请输入搜索关键字');
      return;
    }
    useSearchHistoryStore.getState().addKeyword(keyWordRef.current);
    if (inputRef.current) {
      inputRef.current.clear();
    }

    navigation.navigate('搜索列表', { keyWord: keyWordRef.current });
    keyWordRef.current = null;
  };

  const [searchButtonHeight, setSearchButtonHeight] = React.useState('80%');

  const handleSearchButtonLayout = event => {
    if (searchButtonHeight === '80%') {
      setSearchButtonHeight(event.nativeEvent.layout.height);
    }
  };

  const [version, setVersion] = useState('');

  const buildVersionInfo = async () => {
    const currentVersionInfo = await getCurrentVersionInfo();
    let versionStr = '';
    if (isEmpty(currentVersionInfo?.name)) {
      versionStr = `v${packageVersion}`;
    } else {
      versionStr = `v${packageVersion}.${currentVersionInfo.name}`;
    }
    logUtil.initLogUtil(versionStr);
    setVersion(versionStr);
  };

  useEffect(() => {
    buildVersionInfo();
    if (updateInfo?.expired) {
      setUpdateModalVisible(true);
      return;
    }
    if (updateInfo?.update) {
      // 无元数据定义直接更新
      if (isEmpty(updateInfo?.metaInfo)) {
        setUpdateModalVisible(true);
        isUpdating.current = false;
        isUpdateDone.current = false;
        return;
      }

      try {
        const targetUserNames = JSON.parse(
          updateInfo?.metaInfo,
        )?.targetUserNames;
        if (isEmpty(targetUserNames)) {
          setUpdateModalVisible(true);
          isUpdating.current = false;
          isUpdateDone.current = false;
          return;
        }
        const currentLoginUserName =
          useAuthStore.getState().loginedUser?.userName;
        const userMatched = targetUserNames.some(
          userName => userName === currentLoginUserName,
        );
        logUtil.info(
          `解析热更新包用户名匹配结果：${userMatched}，当前用户名：${currentLoginUserName} 目前用户：${JSON.stringify(
            targetUserNames,
          )}`,
          'SYSTEM',
        );
        setUpdateModalVisible(userMatched);
        if (userMatched) {
          isUpdating.current = false;
          isUpdateDone.current = false;
        }
      } catch (err) {
        logUtil.error(
          `解析热更新包元数据异常，元数据：${
            updateInfo?.metaInfo
          } err：${JSON.stringify(err)}`,
          'SYSTEM',
        );
      }
    }
  }, [updateInfo]);

  const [isUpdateModalVisible, setUpdateModalVisible] = useState(false);
  const [isMsgModalVisible, setMsgModalVisible] = useState(false);
  const hideModal = () => setUpdateModalVisible(false);
  const isUpdating = React.useRef(false);
  const isUpdateDone = React.useRef(false);

  const doUpdate = async () => {
    await playerCore.pause();
    await downloadCore.pauseDownload();
    navigation.goBack();
    navigation.goBack();
    navigation.goBack();
    navigation.goBack();
    navigation.goBack();
    if (updateInfo?.expired) {
      logUtil.info('执行App升级操作', 'UPDATE');
      // app需要更新
      await downloadAndInstallApk(updateInfo?.downloadUrl as string);
    }
    if (updateInfo?.update) {
      logUtil.info('执行热更新操作', 'UPDATE');
      // 仅仅热更新即可
      if (await downloadUpdate()) {
        await switchVersion();
        hideModal();
        isUpdating.current = false;
        isUpdateDone.current = true;
      }
    }
  };

  const handleUpdate = async () => {
    if (isUpdateDone.current) {
      logUtil.info('版本升级成功', 'UPDATE');
      hideModal();
      return;
    }
    isUpdating.current = true;
    doUpdate();
  };

  return (
    <View style={styles.homeView}>
      {/* <View style={styles.container}>
        <Text>
          更新下载进度：{received} / {total}
        </Text>
        <Pressable onPress={checkUpdate}>
          <Text>点击这里检查更新</Text>
        </Pressable>
        {snackbarVisible && (
          <Snackbar
            visible={true}
            onDismiss={() => {
              setShowUpdateSnackbar(false);
            }}
            action={{
              label: '更新',
              onPress: async () => {
                setShowUpdateSnackbar(false);
                if (await downloadUpdate()) {
                  setShowUpdateBanner(true);
                }
              },
            }}>
            <Text>有新版本({updateInfo.name})可用，是否更新？</Text>
          </Snackbar>
        )}
        <Banner
          style={{ width: '100%', position: 'absolute', top: 0 }}
          visible={showUpdateBanner}
          actions={[
            {
              label: '立即重启',
              onPress: switchVersion,
            },
            {
              label: '下次再说',
              onPress: () => {
                switchVersionLater();
                setShowUpdateBanner(false);
              },
            },
          ]}
          icon={({ size }) => (
            <IconNative name="check" size={size} color="#00f" />
          )}>
          更新已完成，是否立即重启？
        </Banner>
      </View> */}
      <View style={styles.noticeView}>
        {loginedUser !== undefined && isEmpty(loginedUser?.weiXin) && (
          <View>
            <Text style={styles.noticeText}>
              如果你看到本提示，请添加作者微信beyondbbk6并告知你的注册用户名，未告知的账号未来可能会被删除。
            </Text>
          </View>
        )}
      </View>
      <View style={styles.searchView}>
        <TextInput
          ref={inputRef}
          style={[styles.searchInput, { height: searchButtonHeight }]}
          onChangeText={text => {
            keyWordRef.current = text;
          }}
          placeholder="开始你的音乐之旅~"
          placeholderTextColor={colors.fontColorVeryLightGray}
          clearButtonMode="while-editing" // iOS 显示清除按钮
        />
        <TouchableOpacity
          style={styles.searchButton}
          onPress={search}
          onLayout={handleSearchButtonLayout}>
          <Text style={commonStyles.normalText}>搜索</Text>
          <Icon
            name="magnifying-glass"
            size={iconSizes.normal}
            color="#fff"
            style={styles.searchIcon}
          />
        </TouchableOpacity>
      </View>
      <View style={defaultView.four}>
        <SearchHistoryList handleClickHistory={handleClickHistory} />
      </View>
      <View style={defaultView.one} />
      <View style={styles.smallPlayerView}>
        <SmallPlayer />
      </View>
      <View style={defaultView.one}>
        <View style={styles.buttonListView}>
          <TouchableOpacity
            style={styles.listButton}
            onPress={() => {
              logUtil.info('进入歌单', 'PLAYLIST');
              navigation.navigate('我的收藏');
            }}>
            <Text style={styles.listButtonText}>收藏</Text>
            <Icon
              name="list"
              size={iconSizes.normal}
              color={colors.bgWhite}
              style={styles.listButtonIcon}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.listButton}
            onPress={() => {
              logUtil.info('进入下载列表', 'DOWNLOAD');
              navigation.navigate('下载列表');
            }}>
            <Text style={styles.listButtonText}>下载</Text>
            <Icon
              name="download"
              size={iconSizes.normal}
              color={colors.bgWhite}
              style={styles.listButtonIcon}
            />
          </TouchableOpacity>

          {/* <TouchableOpacity
            style={styles.listButton}
            onPress={() =>
              ToastUtil.showDefaultToast(ParameterConstant.DISABLED_FEATURE)
            }>
            <Text style={styles.listButtonText}>本地</Text>
            <Icon
              name="sd-card"
              size={iconSizes.normal}
              color={colors.bgWhite}
              style={styles.listButtonIcon}
            />
          </TouchableOpacity> */}

          <TouchableOpacity
            style={styles.listButton}
            onPress={() => navigation.navigate('我的账号')}>
            <Text style={styles.listButtonText}>账号</Text>
            <Icon
              name="user-large"
              size={iconSizes.normal}
              color={colors.bgWhite}
              style={styles.listButtonIcon}
            />
          </TouchableOpacity>
        </View>
        <View style={styles.bottomView}>
          <View style={styles.centered}>
            <Text style={styles.bottomText}>爱生活，爱音乐</Text>
            <Icon
              name="headphones-simple"
              size={fontSizes.small}
              color={colors.fontColorLightGray}
            />
          </View>
          <Text style={styles.rightAligned}>{version}</Text>
        </View>
        <View />
      </View>
      {(isUpdateModalVisible || isMsgModalVisible) && (
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
      <Modal
        animationType="slide"
        transparent={true}
        visible={isUpdateModalVisible}
        onRequestClose={hideModal}>
        <View style={modalStyles.modalOverlay}>
          <View style={modalStyles.modalContainer}>
            <View style={modalStyles.header}>
              <Text style={modalStyles.headerText}>发现新版本</Text>
            </View>

            {updateInfo?.expired && (
              <View style={{ alignItems: 'center' }}>
                <Text style={modalStyles.noticeText}>
                  当前版本已停止维护，请尽快升级~
                </Text>
                <Text style={modalStyles.noticeText}>
                  如无法升级，请切换网络后再试，或直接扫描下方二维码下载安装~
                </Text>
                <Image
                  source={require('./assets/images/download-code.png')}
                  style={{
                    width: 200,
                    height: 200,
                    borderRadius: 10,
                    backgroundColor: '#ddd',
                    marginBottom: 20,
                  }}
                />
              </View>
            )}
            {!updateInfo?.expired && updateInfo?.update && (
              <View style={modalStyles.versionInfo}>
                <Text style={modalStyles.versionText}>
                  版本号 {updateInfo?.name}
                </Text>
                <Text style={modalStyles.updateTitle}>更新内容</Text>
                <View style={modalStyles.updateList}>
                  {JSON.parse(updateInfo?.description || '[]')?.map(
                    (item, index) => (
                      <Text key={index} style={modalStyles.updateItem}>
                        {index + 1} - {item}
                      </Text>
                    ),
                  )}
                </View>
              </View>
            )}

            {/* 按钮区域 */}
            <View style={modalStyles.buttonsContainer}>
              {!updateInfo?.expired && !isUpdateDone.current && (
                <TouchableOpacity
                  disabled={isUpdating.current}
                  style={[
                    modalStyles.listButton,
                    {
                      backgroundColor: isUpdating.current
                        ? colors.bgLoadingBlue
                        : colors.bgBlue,
                    },
                  ]}
                  onPress={() => {
                    hideModal();
                    //setIgnoreUpdate(true);
                  }}>
                  <Text style={modalStyles.listButtonText}>下次再说</Text>
                  <Icon
                    name="arrow-right-from-bracket"
                    size={iconSizes.normal}
                    color={colors.bgWhite}
                    style={modalStyles.listButtonIcon}
                  />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                disabled={isUpdating.current}
                style={[
                  modalStyles.listButton,
                  {
                    backgroundColor: isUpdating.current
                      ? colors.bgLoadingBlue
                      : colors.bgBlue,
                  },
                ]}
                onPress={handleUpdate}>
                <Text style={modalStyles.listButtonText}>
                  {isUpdating.current
                    ? `升级中...${((received / total) * 100).toFixed(0)}%`
                    : isUpdateDone.current
                    ? '升级完成'
                    : '立刻升级'}
                </Text>
                {!isUpdating.current && (
                  <Icon
                    name={isUpdateDone.current ? 'check' : 'circle-up'}
                    size={iconSizes.normal}
                    color={colors.bgWhite}
                    style={modalStyles.listButtonIcon}
                  />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={isMsgModalVisible}
        style={{
          // justifyContent: 'flex-end', // 新页面从底部弹出
          // margin: 0, // 禁用默认的 margin
          margin: 0, // 禁用默认的 margin
          flex: 1, // 使用 flex 布局让模态框充满整个屏幕
          justifyContent: 'center', // 居中对齐
        }}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setMsgModalVisible(false)}>
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
                  color:
                    currentShowMsg.current?.msgType === 'NORMAL'
                      ? colors.fontColorDrakGray
                      : colors.fontColorRed,

                  // position: 'absolute', // 绝对定位
                  // left: 0,
                  // right: 0,
                  // textAlign: 'center',
                  //left: '50%', // 水平偏移到容器中心
                  //transform: [{ translateX: -50 }], // 偏移自身宽度的一半，确保绝对居中
                }}>
                {currentShowMsg.current?.msgTitle}
              </Text>
            </View>

            <View style={{ flexDirection: 'column' }}>
              <Text
                style={{
                  fontSize: fontSizes.littlenormal,
                  color: colors.fontColorDrakGray,
                }}>
                {currentShowMsg.current?.msgContent
                  .split('#')
                  .map((line, index) => (
                    <Text key={index}>
                      {line}
                      {'\n'}
                    </Text>
                  ))}
              </Text>
            </View>

            {/* 选中指示器 */}
            {/* <View style={styles1.selectionIndicator} /> */}

            {/* 操作按钮 */}
            <View style={styles1.buttonRow}>
              <TouchableOpacity
                style={[
                  styles1.button,
                  styles1.confirmButton,
                  {
                    backgroundColor:
                      timeSeconds > 0
                        ? colors.bgLoadingBlue
                        : colors.fontColorBlue,
                  },
                ]}
                disabled={timeSeconds > 0}
                onPress={() => {
                  console.log(`此时的timeSeconds：${timeSeconds}`);
                  if (timeSeconds === 0) {
                    setUserMsgRead(currentShowMsg.current.id);
                    logUtil.info('用户阅读消息完毕，并关闭消息窗口~', 'SYSTEM');
                    // clearInterval(timeIntervalId);
                  } else {
                    ToastUtil.showDefaultToast('请仔细阅读消息~');
                  }
                }}>
                <Text
                  style={
                    styles1.buttonText
                  }>{`我知道了(${timeSeconds}秒)`}</Text>
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
}

const Stack = createNativeStackNavigator();

function RootStack() {
  return (
    <Stack.Navigator
      initialRouteName="享听"
      screenOptions={({ navigation, route }) => ({
        header: () => <MyHeader title={route.name} navigation={navigation} />,
      })}>
      <Stack.Screen
        name="享听"
        component={HomeScreen}
        options={{ headerShown: true, headerTitleAlign: 'center' }}
      />
      <Stack.Screen
        name="正在播放"
        component={MusicPlayerScreen}
        options={{ headerShown: true, headerTitleAlign: 'center' }}
      />
      <Stack.Screen
        name="搜索列表"
        component={SearchScreen}
        options={{ headerShown: true, headerTitleAlign: 'center' }}
      />
      <Stack.Screen
        name="歌手详情"
        component={SingerDetailsScreen}
        options={{ headerShown: true, headerTitleAlign: 'center' }}
      />
      <Stack.Screen
        name="专辑详情"
        component={AlumDetailsScreen}
        options={{ headerShown: true, headerTitleAlign: 'center' }}
      />
      <Stack.Screen
        name="歌单详情"
        component={PlaylistDetailsScreen}
        options={{ headerShown: true, headerTitleAlign: 'center' }}
      />
      <Stack.Screen
        name="我的账号"
        component={AccountScreen}
        options={{ headerShown: true, headerTitleAlign: 'center' }}
      />
      <Stack.Screen
        name="我的收藏"
        component={MyPlayListScreen}
        options={{ headerShown: true, headerTitleAlign: 'center' }}
      />
      <Stack.Screen
        name="下载列表"
        component={DownloadListScreen}
        options={{ headerShown: true, headerTitleAlign: 'center' }}
      />
      <Stack.Screen
        name="声音专辑"
        component={SoundAlbumDetailsScreen}
        options={{ headerShown: true, headerTitleAlign: 'center' }}
      />
    </Stack.Navigator>
  );
}

export default function App() {
  const isAuthHydrated = useAuthStore(state => state.isHydrated);
  const isSearchListHydrated = useSearchHistoryStore(state => state.isHydrated);
  const loginedUser = useAuthStore(state => state.loginedUser);
  const isPlaylistHydrated = usePlaylistStore(state => state.isHydrated);
  const isDownloadListHydrated = useDownloadListStore(
    state => state.isHydrated,
  );
  // console.log(
  //   `isAuthHydrated:${isAuthHydrated} isSearchListHydrated:${isSearchListHydrated} loginedUser:${loginedUser} isPlaylistHydrated:${isPlaylistHydrated} isDownloadListHydrated:${isDownloadListHydrated}`,
  // );
  if (
    !isAuthHydrated ||
    !isSearchListHydrated ||
    !isPlaylistHydrated ||
    !isDownloadListHydrated
  ) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#007BFF" />
      </View>
    );
  } else {
    initializeAxios(loginedUser?.token as string);
    initTrackPlayer();
    downloadCore.initDownload();
  }
  console.log(
    `当前downloadStore数据，downloadListLength：${JSON.stringify(
      useDownloadListStore.getState().downLoadList.length,
    )} currentDownloadIndex:${
      useDownloadListStore.getState().currentDownloadIndex
    } downloadStatus:${
      useDownloadListStore.getState().downloadQueueTaskStatus
    }`,
  );

  return (
    <PushyProvider client={pushyClient}>
      {/* ↓ 整个应用的根组件放到PushyProvider */}
      <NavigationContainer>
        <RootStack />
      </NavigationContainer>
    </PushyProvider>
  );
}

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

const modalStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    width: 300,
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
  },
  header: {
    marginBottom: 10,
    alignItems: 'center',
  },
  headerText: {
    fontSize: fontSizes.big,
    fontWeight: 'bold',
    color: colors.fontColorDrakGray,
  },
  versionInfo: {
    marginBottom: 10,
  },
  versionText: {
    fontSize: fontSizes.normal,
    marginBottom: 10,
    color: colors.fontColorLightGray,
    textAlign: 'center',
  },
  noticeText: {
    fontSize: fontSizes.normal,
    marginBottom: 20,
    color: colors.fontColorRed,
    textAlign: 'center',
  },
  updateTitle: {
    fontSize: fontSizes.normal,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  updateList: {
    marginLeft: 10,
  },
  updateItem: {
    fontSize: fontSizes.small,
    marginBottom: 5,
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  listButton: {
    ...commonStyles.normalButton,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 5,
  },
  listButtonText: {
    ...commonStyles.normalText,
  },
  listButtonIcon: {
    marginLeft: 4,
  },
});

const styles = StyleSheet.create({
  normalText: {
    ...commonStyles.normalText,
  },
  samllText: {
    ...commonStyles.smallText,
  },
  commonButton: {
    ...commonStyles.normalButton,
  },
  homeView: {
    ...commonStyles.view,
    padding: 10,
    flex: 1,
  },
  noticeView: {
    ...commonStyles.view,
    padding: 10,
    flex: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallPlayerView: {
    flex: 2,
    justifyContent: 'center',
  },
  searchView: {
    ...commonStyles.view,
    flexDirection: 'row', // 水平排列
    alignItems: 'center', // 垂直居中
    justifyContent: 'center',
    //justifyContent: 'flex-end',
    paddingVertical: 5,
    paddingHorizontal: 10,
    //marginHorizontal: 10,
    width: '90%',
    alignSelf: 'center',
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.bgBlue, // 边框颜色为蓝色
    //borderRadius: 5,
    borderBottomLeftRadius: 5,
    borderTopLeftRadius: 5,
    paddingHorizontal: 10,
    color: colors.fontColorDrakGray,

    //marginRight: 10, // 和按钮之间的间距
    //backgroundColor: '#fff',
  },

  searchIcon: { marginLeft: 5 },
  listButtonText: {
    ...commonStyles.normalText,
  },
  searchButton: {
    ...commonStyles.normalButton,
    paddingHorizontal: featureButtonBig.paddingHorizontal,
    paddingVertical: featureButtonBig.paddingVertical,
    borderRadius: featureButtonBig.borderRadius,
    borderBottomLeftRadius: 0,
    borderTopLeftRadius: 0,
  },

  buttonListView: {
    flex: 4,
    flexDirection: 'row', // 水平布局
    justifyContent: 'space-between', // 平均分布按钮，间距均等
    alignItems: 'center', // 按钮在垂直方向对齐
  },

  listButton: {
    ...commonStyles.normalButton,
    //flex: 1, // 平均分配空间
    //marginHorizontal: 4, // 按钮之间的间距
    paddingVertical: featureButtonNormal.paddingVertical,
    paddingHorizontal: featureButtonNormal.paddingHorizontal,
    borderRadius: featureButtonNormal.borderRadius,
    flexDirection: 'row',
    alignItems: 'center',
    // marginHorizontal: 2,
  },

  listButtonIcon: {
    marginLeft: 4,
  },

  bottomView: {
    flex: 2,
    flexDirection: 'row', // 水平排列
    justifyContent: 'center', // 内容水平居中
    alignItems: 'center', // 垂直居中
    width: '100%', // 确保宽度为100%
    position: 'relative', // 使右对齐的Text不受布局影响
  },
  centered: {
    flexDirection: 'row', // 水平布局
    justifyContent: 'center', // 水平居中
    alignItems: 'center', // 垂直居中
    position: 'absolute', // 确保它相对于父容器居中
    left: 0,
    right: 0,
    // left: '50%', // 水平居中
    // transform: [{ translateX: -100 }], // 调整居中位置
  },
  rightAligned: {
    position: 'absolute', // 绝对定位
    right: 5, // 根据需要调整右边距
    fontSize: fontSizes.verySmall,
    color: colors.fontColorVeryLightGray,
  },
  bottomText: {
    ...commonStyles.smallText,
    color: colors.fontColorLightGray,
    paddingRight: 5,
  },
  noticeText: {
    ...commonStyles.smallText,
    color: colors.fontColorRed,
  },
});
