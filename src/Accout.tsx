import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import { useAuthStore } from './global/useAuthStore';
import apiClient from './utils/ApiClient';
import ToastUtil from './utils/ToastUtil';
import {
  colors,
  commonStyles,
  featureButtonBig,
  featureButtonNormal,
  fontSizes,
  iconSizes,
} from './Common.styles';
import Icon from 'react-native-vector-icons/FontAwesome6';
import logUtil from './utils/LogUtil';
import { BlurView } from '@react-native-community/blur';
import Modal from 'react-native-modal';
import { isEmpty } from 'lodash';
import playerCore from './playerCore';
import downloadCore from './downloadCore';
import MyUtils from './utils/MyUtils';

const enum AccountStatus {
  NOT_LOGIN = 'NOT_LOGIN',
  LOGIN_SUCCESSFUl = 'LOGIN_SUCCESSFUL',

  REGISTING = 'REGISTING',
}

const Account = (_props?: { route?: any; navigation?: any }) => {
  const loginedUser = useAuthStore.getState().loginedUser;
  const currentAccountStatus =
    loginedUser !== null
      ? AccountStatus.LOGIN_SUCCESSFUl
      : AccountStatus.NOT_LOGIN;
  const [loading, setLoding] = useState(false);
  const [accountStatus, setAccountStatus] = useState(currentAccountStatus);
  const [userName, setUserName] = useState(''); // 用户名
  const [password, setPassword] = useState(''); // 密码
  const [confirmPassword, setConfirmPassword] = useState(''); // 确认密码
  const [inviteCode, setInviteCode] = useState(''); // 邀请码
  const [authorModalVisible, setAuthorModalVisible] = useState(false);
  const [musicLimitCnt, setMusicLimitCnt] = useState(0);
  const [musicPlaiedCnt, setMusicPlaiedCnt] = useState(0);
  const [soundLimitCnt, setSoundLimitCnt] = useState(0);
  const [soundPlaiedCnt, setSoundPlaiedCnt] = useState(0);
  const [hifiLimt, setHifiLimit] = useState(0);
  const [hifiPlaied, setHifiPlaied] = useState(0);
  const [downloadLimit, setDownloadLimt] = useState(0);
  const [downloadSuccess, setDownloadSuccess] = useState(0);
  const [soundBookmarkLimit, setSoundBookmarkLimit] = useState(0);
  const [soundBookmarkSuccess, setSoundBookmarkSuccess] = useState(0);
  const [soundCacheSuccess, setSoundCacheSuccess] = useState(0);
  const [soundCacheLimit, setSoundCacheLimit] = useState(0);

  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [updateUserResult, setUpdateUserResult] = useState('');

  const [updateModalVisible, setUpdateModalVisible] = useState(false);
  let keyWordRef = React.useRef('');
  const inputRef = React.useRef(null);
  const [searchButtonHeight, setSearchButtonHeight] = React.useState('80%');

  const updateLimitInfo = async () => {
    setMusicLimitCnt(await playerCore.musicLimit());
    setMusicPlaiedCnt(await playerCore.musicPlaied());
    setSoundLimitCnt(await playerCore.soundLimit());
    setSoundPlaiedCnt(await playerCore.soundPlaied());
    setHifiLimit(await playerCore.hifiLimt());
    setHifiPlaied(await playerCore.hifiPlaied());
    setDownloadLimt(await downloadCore.downloadLimit());
    setDownloadSuccess(await downloadCore.downloadSuccessCnt());
    setSoundCacheLimit(await MyUtils.getSoundCacheLimt());
    setSoundCacheSuccess(await MyUtils.getSoundCacheSuccess());
    setSoundBookmarkLimit(await MyUtils.getSoundBookmarkLimt());
    setSoundBookmarkSuccess(await MyUtils.getSoundBookmarkSuccess());
  };

  useEffect(() => {
    console.log('触发刷新限额信息~');
    if (loginedUser !== null) {
      updateLimitInfo();
    }
  }, [loginedUser]);

  const handleSearchButtonLayout = event => {
    console.log(
      `event.nativeEvent.layout.height:${event.nativeEvent.layout.height}`,
    );
    if (searchButtonHeight === '80%') {
      setSearchButtonHeight(event.nativeEvent.layout.height);
    }
  };

  const commonApiRequest = async logic => {
    setLoding(true);
    try {
      return await logic();
    } finally {
      setLoding(false);
    }
  };

  // 登录处理逻辑
  const handleLogin = async () => {
    commonApiRequest(async () => {
      const response = await apiClient.post('/user/login', {
        userName,
        password,
      });
      ToastUtil.showDefaultToast('登录成功');
      const result = response.data.result;
      useAuthStore.getState().setUser({
        userName: result.userName ?? null,
        token: result.token ?? null,
        expiredTime: result.expiredTime ?? null,
        createTime: result.createTime ?? null,
        weiXin: result.weiXin ?? null,
        userType: result.userType ?? null,
      });
      apiClient.defaults.headers.common.token = result.token;
      setAccountStatus(AccountStatus.LOGIN_SUCCESSFUl);
      logUtil.info(`用户${result.userName}登录成功`, 'ACCOUNT');
    });
  };

  // 注册处理逻辑
  const handleRegister = async () => {
    commonApiRequest(async () => {
      await apiClient.post('/user/create', {
        userName,
        password,
        confirmPassword,
      });
      ToastUtil.showDefaultToast('注册成功');
      setAccountStatus(AccountStatus.NOT_LOGIN); // 返回登录界面
    });
  };

  // 退出登录处理逻辑
  const handleLogout = async () => {
    commonApiRequest(async () => {
      const response = await apiClient.post('/user/logout');
      console.log(response.data);
      ToastUtil.showDefaultToast('已退出登录');

      useAuthStore.getState().clearUser();
      apiClient.defaults.headers.common.token = null;

      setUserName('');
      setPassword('');
      setConfirmPassword('');
      setInviteCode('');
      setAccountStatus(AccountStatus.NOT_LOGIN);
    });
  };

  const handleUpdateUser = async () => {
    console.log('当前输入的微信id：' + keyWordRef.current);
    if (isEmpty(keyWordRef.current)) {
      ToastUtil.showErrorToast('请输入微信id');
      return;
    }
    // 调用接口
    try {
      const updateUserResponse = await apiClient.post(
        '/user/updateVip?weixinId=' + keyWordRef.current,
      );
      const updatedUser = updateUserResponse.data.result;
      console.log(`升级后的UserInfo：${JSON.stringify(updatedUser)}`);
      useAuthStore.getState().setUser(updatedUser);
      setUpdateUserResult('领取成功，已获得7天内部用户资格~');
      logUtil.info('用户领取了7天的内部用户资格~', 'ACCOUNT');
    } catch (err) {
      setUpdateUserResult(
        '领取失败，可能未绑定微信，微信id输入错误或已经领取过了~',
      );
      logUtil.info('用户领取了7天的内部用户资格失败了~', 'ACCOUNT');
    }
  };

  function buildView() {
    if (accountStatus === AccountStatus.LOGIN_SUCCESSFUl) {
      return (
        <View style={styles.loggedInContainer}>
          <Image
            source={require('./assets/images/default.user.png')}
            style={styles.avatar}
          />
          <View style={styles.loginedView}>
            <Text style={styles.loginedtextTile}>用户名：</Text>
            <Text style={styles.loginedtextValue}>{loginedUser?.userName}</Text>
          </View>
          <View style={styles.loginedView}>
            <Text style={styles.loginedtextTile}>注册时间：</Text>
            <Text style={styles.loginedtextValue}>
              {loginedUser?.createTime}
            </Text>
          </View>
          <View style={styles.loginedView}>
            <Text style={styles.loginedtextTile}>过期时间：</Text>
            <Text style={styles.loginedtextValue}>
              {loginedUser?.expiredTime}
            </Text>
          </View>
          <View style={styles.loginedView}>
            <Text style={styles.loginedtextTile}>微信绑定：</Text>
            <Text style={styles.loginedtextValue}>
              {isEmpty(loginedUser?.weiXin) ? '未绑定' : '已绑定'}
            </Text>
          </View>
          <View style={styles.loginedView}>
            <Text style={styles.loginedtextTile}>用户类型：</Text>
            <Text style={styles.loginedtextValue}>
              {isEmpty(loginedUser?.userType)
                ? '共享用户'
                : loginedUser?.userType?.toUpperCase() === 'VIP'
                ? '内部用户'
                : '共享用户'}
              <Text
                onPress={() => {
                  setUpdateModalVisible(true);
                  logUtil.info('用户点击了账号界面的升级按钮', 'ACCOUNT');
                }}
                style={styles.updateButtonText}>
                {' '}
                升级
              </Text>
            </Text>
          </View>
          <View style={styles.loginedView}>
            <Text style={styles.loginedtextTile}>音乐限额：</Text>
            <Text style={styles.loginedtextValue}>
              {musicLimitCnt}首/天，已播放{musicPlaiedCnt}首
            </Text>
          </View>
          <View style={styles.loginedView}>
            <Text style={styles.loginedtextTile}>声音限额：</Text>
            <Text style={styles.loginedtextValue}>
              {soundLimitCnt}个/天，已播放{soundPlaiedCnt}个
            </Text>
          </View>
          <View style={styles.loginedView}>
            <Text style={styles.loginedtextTile}>下载限额：</Text>
            <Text style={styles.loginedtextValue}>
              {downloadLimit}首/天，已下载{downloadSuccess}首
            </Text>
          </View>
          <View style={styles.loginedView}>
            <Text style={styles.loginedtextTile}>无损限额：</Text>
            <Text style={styles.loginedtextValue}>
              {hifiLimt}首/天，已播放{hifiPlaied}首
            </Text>
          </View>
          <View style={styles.loginedView}>
            <Text style={styles.loginedtextTile}>声音收藏：</Text>
            <Text style={styles.loginedtextValue}>
              {soundBookmarkLimit}张/天，已收藏{soundBookmarkSuccess}张
            </Text>
          </View>
          <View style={styles.loginedView}>
            <Text style={styles.loginedtextTile}>声音缓存：</Text>
            <Text style={styles.loginedtextValue}>
              {soundCacheLimit}个/天，已缓存{soundCacheSuccess}个
            </Text>
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.buttonText}>
              {loading ? '退出登录中...' : '退出登录'}
            </Text>
            <Icon
              name="right-from-bracket"
              color={colors.fontColorWhite}
              size={iconSizes.normal}
              style={styles.buttonIcon}
            />
          </TouchableOpacity>
        </View>
      );
    }
    if (accountStatus === AccountStatus.REGISTING) {
      return (
        <View>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 10,
            }}>
            <Text style={styles.textTile}>用户名：</Text>
            <TextInput
              style={styles.input}
              placeholder="长度2-10，任意字符"
              placeholderTextColor={colors.fontColorVeryLightGray}
              value={userName}
              onChangeText={setUserName}
            />
          </View>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 10,
            }}>
            <Text style={styles.textTile}>密码：</Text>
            <TextInput
              secureTextEntry={true} // 启用密码掩码
              style={styles.input}
              placeholder="长度5-20，任意字符"
              placeholderTextColor={colors.fontColorVeryLightGray}
              value={password}
              onChangeText={setPassword}
            />
          </View>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 10,
            }}>
            <Text style={styles.textTile}>确认密码：</Text>
            <TextInput
              secureTextEntry={true} // 启用密码掩码
              style={styles.input}
              placeholder="请再次输入密码"
              placeholderTextColor={colors.fontColorVeryLightGray}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
          </View>
          {/* <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 10,
            }}>
            <Text style={styles.textTile}>邀请码：</Text>
            <TextInput
              style={styles.input}
              placeholder="内测期间，非必填"
              placeholderTextColor={colors.fontColorVeryLightGray}
              value={inviteCode}
              onChangeText={setInviteCode}
            />
          </View> */}
          <View style={{ alignItems: 'center' }}>
            <TouchableOpacity
              disabled={loading}
              style={{
                backgroundColor: loading ? '#3399FF' : '#007BFF', // 根据 loading 状态动态切换颜色
                paddingHorizontal: featureButtonNormal.paddingHorizontal,
                paddingVertical: featureButtonNormal.paddingVertical,
                alignItems: 'center',
                borderRadius: featureButtonNormal.borderRadius,
                marginTop: 10,
                //width: '30%',
              }}
              onPress={handleRegister}>
              <Text
                style={{
                  color: '#fff',
                  fontWeight: 'bold',
                  fontSize: fontSizes.normal,
                }}>
                {loading ? '注册中...' : '注册'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setAccountStatus(AccountStatus.NOT_LOGIN)}
              style={{ marginTop: 10, alignItems: 'center' }}>
              <Text
                style={{ color: colors.bgBlue, fontSize: fontSizes.normal }}>
                返回登录
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }
    return (
      <View>
        {/* <View style={{ marginBottom: 20 }}>

        </View> */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 10,
          }}>
          <Text style={styles.textTile}>用户名：</Text>
          <TextInput
            style={styles.input}
            placeholder="请输入用户名"
            placeholderTextColor={colors.fontColorVeryLightGray}
            value={userName}
            onChangeText={setUserName}
          />
        </View>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 10,
          }}>
          <Text style={styles.textTile}>密码：</Text>
          <TextInput
            style={styles.input}
            placeholder="请输入密码"
            placeholderTextColor={colors.fontColorVeryLightGray}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={true} // 启用密码掩码
          />
        </View>
        <View style={{ alignItems: 'center' }}>
          <TouchableOpacity
            disabled={loading}
            style={[
              styles.loginButton,
              {
                backgroundColor: loading ? colors.bgLoadingBlue : colors.bgBlue,
              },
            ]}
            onPress={handleLogin}>
            <Text
              style={{
                color: '#fff',
                fontWeight: 'bold',
                fontSize: fontSizes.normal,
              }}>
              {loading ? '登录中...' : '登录'}
            </Text>
            {/* <Icon
              name="user-check"
              color={colors.fontColorWhite}
              size={iconSizes.normal}
              style={styles.buttonIcon}
            /> */}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setAccountStatus(AccountStatus.REGISTING)}
            style={{ marginTop: 10, alignItems: 'center' }}>
            <Text style={{ color: colors.bgBlue, fontSize: fontSizes.normal }}>
              注册账号
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 15,
        backgroundColor: colors.bgWhite,
      }}>
      {/* <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={[commonStyles.smallText, commonStyles.warnColor]} />
      </View> */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingVertical: 10,
          width: '100%',
        }}>
        <TouchableOpacity
          onPress={() => setAuthorModalVisible(!authorModalVisible)}
          style={{
            backgroundColor: colors.fontColorBlue,
            paddingVertical: featureButtonNormal.paddingVertical,
            paddingHorizontal: featureButtonNormal.paddingHorizontal,
            borderRadius: featureButtonNormal.borderRadius,
            marginTop: 10,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Text style={styles.buttonText}>作者</Text>
          <Icon
            name="weixin"
            color={colors.fontColorWhite}
            size={iconSizes.normal}
            style={styles.buttonIcon}
          />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            setShareModalVisible(!shareModalVisible);
          }}
          style={{
            backgroundColor: colors.fontColorBlue,
            paddingVertical: featureButtonNormal.paddingVertical,
            paddingHorizontal: featureButtonNormal.paddingHorizontal,
            borderRadius: featureButtonNormal.borderRadius,
            marginTop: 10,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Text style={styles.buttonText}>分享</Text>
          <Icon
            name="share"
            color={colors.fontColorWhite}
            solid={true}
            size={iconSizes.normal}
            style={styles.buttonIcon}
          />
        </TouchableOpacity>
      </View>
      {buildView()}
      <View style={{ flex: 5 }} />
      {(authorModalVisible || shareModalVisible || updateModalVisible) && (
        <BlurView
          style={{
            position: 'absolute',
            zIndex: 0,
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
        isVisible={authorModalVisible}
        style={{
          // justifyContent: 'flex-end', // 新页面从底部弹出
          // margin: 0, // 禁用默认的 margin
          margin: 0, // 禁用默认的 margin
          flex: 1, // 使用 flex 布局让模态框充满整个屏幕
          justifyContent: 'center', // 居中对齐
        }}
        onRequestClose={() => setAuthorModalVisible(false)}>
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
                联系作者
              </Text>
            </View>

            <View style={{ flexDirection: 'column' }}>
              <Text
                style={{
                  fontSize: fontSizes.normal,
                  color: colors.fontColorDrakGray,
                }}>
                Hi，很高兴你使用我开发的软件，本软件集成了QQ音乐超级会员/网易云SVIP/喜马拉雅SVIP和少儿VIP资源，界面简洁(丑)，核心功能完备，这也是我的自用软件，所以永远不会有广告，使用过程中有任何问题或者需求建议可以加我微信。
              </Text>
              <View style={{ flexDirection: 'column', alignItems: 'center' }}>
                <Text
                  style={{
                    fontSize: fontSizes.normal,
                    color: colors.fontColorRed,

                    marginTop: 10,
                  }}>
                  防失联微信号：beyondbbk6
                </Text>
                <Image
                  source={require('./assets/images/myWechat.png')}
                  style={{
                    width: 200,
                    height: 200,
                    borderRadius: 10,
                    backgroundColor: '#ddd',
                    marginVertical: 20,
                  }}
                />
              </View>
            </View>

            {/* 选中指示器 */}
            {/* <View style={styles1.selectionIndicator} /> */}

            {/* 操作按钮 */}
            <View style={styles1.buttonRow}>
              <TouchableOpacity
                style={[styles1.button, styles1.confirmButton]}
                onPress={() => setAuthorModalVisible(false)}>
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
        isVisible={shareModalVisible}
        style={{
          // justifyContent: 'flex-end', // 新页面从底部弹出
          // margin: 0, // 禁用默认的 margin
          margin: 0, // 禁用默认的 margin
          flex: 1, // 使用 flex 布局让模态框充满整个屏幕
          justifyContent: 'center', // 居中对齐
        }}
        onRequestClose={() => setShareModalVisible(false)}>
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
                分享本软件
              </Text>
            </View>

            <View style={{ flexDirection: 'column' }}>
              <Text
                style={{
                  fontSize: fontSizes.normal,
                  color: colors.fontColorDrakGray,
                }}>
                本软件目前还可以公开注册使用，如果觉得软件好用，欢迎推荐给你身边的朋友。
              </Text>
              <View style={{ flexDirection: 'column', alignItems: 'center' }}>
                <Text
                  style={{
                    fontSize: fontSizes.normal,
                    color: colors.fontColorRed,

                    marginTop: 10,
                  }}>
                  请直接用浏览器扫码下载，勿用微信。
                </Text>
                <Image
                  source={require('./assets/images/download-code.png')}
                  style={{
                    width: 200,
                    height: 200,
                    borderRadius: 10,
                    backgroundColor: '#ddd',
                    marginVertical: 20,
                  }}
                />
              </View>
            </View>

            {/* 选中指示器 */}
            {/* <View style={styles1.selectionIndicator} /> */}

            {/* 操作按钮 */}
            <View style={styles1.buttonRow}>
              <TouchableOpacity
                style={[styles1.button, styles1.confirmButton]}
                onPress={() => setShareModalVisible(false)}>
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
        isVisible={updateModalVisible}
        style={{
          // justifyContent: 'flex-end', // 新页面从底部弹出
          // margin: 0, // 禁用默认的 margin
          margin: 0, // 禁用默认的 margin
          flex: 1, // 使用 flex 布局让模态框充满整个屏幕
          justifyContent: 'center', // 居中对齐
        }}
        onRequestClose={() => setUpdateModalVisible(false)}>
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
                升级为内部用户
              </Text>
            </View>

            <View style={{ flexDirection: 'column' }}>
              <Text
                style={{
                  fontSize: fontSizes.littlenormal,
                  color: colors.fontColorDrakGray,
                }}>
                享听App自25年1月份上线以来，目前用户数接近系统承载极限了，最近频繁被风控，维护成本持续在增加，坦率的讲，为爱发电3个月有点发不动了，现计划招募一批内部用户帮我分摊下维护成本。
                {'\n'}
                {'\n'} 成为内部用户，你将获得：{'\n'}
                1，一直稳定可用的内部版本，公开版考虑维护成本或其他风险可能随时停止服务。
                {'\n'}
                2，更高额度的无损播放，下载和有声书缓存次数。{'\n'}
                3，参与App开发计划，内部用户的需求建议会优先考虑并实现。
                {'\n'}
                {'\n'}
                更多细节，请添加作者微信beyondbbk6了解。{'\n'}
              </Text>
            </View>
            <View style={{ flexDirection: 'column' }}>
              <Text
                style={{
                  fontSize: fontSizes.littlenormal,
                  color: colors.fontColorRed,
                }}>
                如果你绑定了微信，可输入你的微信id，领取1次7天内部用户资格。
              </Text>
              <View style={styles.searchView}>
                <TextInput
                  ref={inputRef}
                  style={[styles.searchInput, { height: Number(searchButtonHeight) || 40 }]}
                  onChangeText={text => {
                    keyWordRef.current = text;
                  }}
                  placeholder="输入你的微信id~"
                  placeholderTextColor={colors.fontColorVeryLightGray}
                  clearButtonMode="while-editing" // iOS 显示清除按钮
                />
                <TouchableOpacity
                  style={styles.searchButton}
                  onPress={handleUpdateUser}
                  onLayout={handleSearchButtonLayout}>
                  <Text style={commonStyles.smallText}>领取</Text>
                  <Icon
                    name="check"
                    size={iconSizes.normal}
                    color="#fff"
                    style={styles.searchIcon}
                  />
                </TouchableOpacity>
              </View>
              <Text
                style={{
                  fontSize: fontSizes.littlenormal,
                  color: colors.fontColorRed,
                  textAlign: 'center',
                }}>
                {updateUserResult}
              </Text>
            </View>

            {/* 选中指示器 */}
            {/* <View style={styles1.selectionIndicator} /> */}

            {/* 操作按钮 */}
            <View style={styles1.buttonRow}>
              <TouchableOpacity
                style={[styles1.button, styles1.confirmButton]}
                onPress={() => {
                  setUpdateModalVisible(false);
                  setUpdateUserResult('');
                }}>
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
    zIndex: 0,
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
  searchIcon: { marginLeft: 5 },
  listButtonText: {
    ...commonStyles.normalText,
  },
  searchButton: {
    ...commonStyles.normalButton,
    paddingHorizontal: featureButtonNormal.paddingHorizontal,
    paddingVertical: featureButtonNormal.paddingVertical,
    borderRadius: featureButtonNormal.borderRadius,
    borderBottomLeftRadius: 0,
    borderTopLeftRadius: 0,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.bgBlue, // 边框颜色为蓝色
    //borderRadius: 5,
    borderBottomLeftRadius: 5,
    borderTopLeftRadius: 5,
    paddingVertical: 0,
    paddingHorizontal: 10,
    fontSize: fontSizes.small,
    color: colors.fontColorDrakGray,

    //marginRight: 10, // 和按钮之间的间距
    //backgroundColor: '#fff',
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
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    backgroundColor: '#fff',
  },
  textTile: {
    fontSize: fontSizes.normal,
    width: '30%',
    textAlign: 'right',
    color: colors.fontColorLightGray,
  },
  loginedView: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 5,
  },

  authorView: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    padding: 10,
  },

  loginedtextTile: {
    fontSize: fontSizes.normal,
    width: '35%',
    textAlign: 'right',
    color: colors.fontColorLightGray,
  },

  loginedtextValue: {
    paddingHorizontal: 10,
    //marginBottom: 10,
    fontSize: fontSizes.normal,
    // minWidth: '50%',
    // maxWidth: '75%',
    width: '65%',
    alignItems: 'center',
    justifyContent: 'center',
    color: colors.fontColorLightGray,
  },
  input: {
    //height: 40,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    paddingHorizontal: 10,
    //marginBottom: 10,
    backgroundColor: '#fff',
    color: colors.fontColorDrakGray,
    height: '80%',
    width: '55%',
  },
  avatar: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#ddd',
    marginBottom: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    //justifyContent: 'space-between',
    //alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    //width: '60%',
  },
  loginButton: {
    //flex: 1,
    // 根据 loading 状态动态切换颜色
    paddingVertical: featureButtonNormal.paddingVertical,
    paddingHorizontal: featureButtonNormal.paddingHorizontal,

    alignItems: 'center',
    borderRadius: featureButtonNormal.borderRadius,
    marginTop: 10,
    flexDirection: 'row',
    //width: '30%',
  },
  registerButton: {
    //flex: 1,
    backgroundColor: '#007BFF',
    paddingVertical: featureButtonNormal.paddingVertical,
    paddingHorizontal: featureButtonNormal.paddingHorizontal,
    alignItems: 'center',
    borderRadius: featureButtonNormal.borderRadius,
    //marginLeft: 10,
  },

  buttonText: {
    color: colors.fontColorWhite,

    fontSize: fontSizes.normal,
  },

  updateButtonText: {
    color: colors.bgBlue,
    fontSize: fontSizes.normal,
  },

  loggedInContainer: {
    alignItems: 'center',
  },
  userInfo: {
    fontSize: fontSizes.normal,
    color: '#333',
    marginBottom: 10,
  },
  logoutButton: {
    backgroundColor: colors.fontColorRed,
    paddingVertical: featureButtonNormal.paddingVertical,
    paddingHorizontal: featureButtonNormal.paddingHorizontal,
    borderRadius: featureButtonNormal.borderRadius,
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  updateButton: {
    backgroundColor: colors.fontColorRed,
    paddingVertical: featureButtonNormal.paddingVertical,
    paddingHorizontal: featureButtonNormal.paddingHorizontal,
    borderRadius: featureButtonNormal.borderRadius,

    flexDirection: 'row',
    // alignItems: 'center',
    // justifyContent: 'center',
  },

  buttonIcon: {
    marginLeft: 5,
  },
});

export default Account;
