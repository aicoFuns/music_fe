import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome6';
import { getStatusBarHeight } from 'react-native-status-bar-height';
import { fontSizes } from './Common.styles';

const statusBarHeight = getStatusBarHeight();

const MyHeader = ({ title, navigation }) => {
  //Alert.alert(`statusBarHeight:${statusBarHeight}`);
  return (
    <View style={styles.headerContainer}>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="dark-content"
      />
      <View style={styles.header}>
        {/* 左侧返回按钮 */}
        {navigation.canGoBack() && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}>
            <Icon name="angles-left" size={fontSizes.normal} color="black" />
          </TouchableOpacity>
        )}
        {/* 标题 */}
        <Text style={styles.title}>{title}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: '#f2f2f2',
  },
  header: {
    height: 50,
    //paddingTop: 25,
    //marginVertical: 20,
    marginTop: 25 + 5,
    marginBottom: 5,
    // height: 60,
    // paddingTop: 100,
    position: 'relative', // 为 Text 的绝对定位提供参考
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: { paddingLeft: 15, zIndex: 1 },
  title: {
    color: 'black',
    textAlign: 'center',
    fontSize: fontSizes.big,
    fontWeight: 'bold',
    //transform: [{ translateX: -50 }],
    //transform: [{ translateX: -50 }, { translateY: -50 }], // 同时水平和垂直居中
    position: 'absolute',
    //left: '50%',
    left: 0,
    right: 0,
    //paddingHorizontal: 15,
    //paddingTop: StatusBar.currentHeight,
    //top: '50%',
  },
});

export default MyHeader;
