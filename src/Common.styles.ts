import { StyleSheet } from 'react-native';
import { RFValue } from 'react-native-responsive-fontsize';

export const colors = {
  bgBlue: '#007bff',
  bgLoadingBlue: '#3399FF',
  bgWhite: '#fff',
  bgLightGray: '#DDD',
  fontColorWhite: '#fff',
  fontColorBlack: 'black',
  fontColorDrakGray: '#333',
  fontColorLightGray: '#666',
  fontColorVeryLightGray: '#999',
  fontColorRed: '#FF4D4F',
  fontColorGreen: '#00B2B0',
  fontColorBlue: '#007bff',
};

export const iconSizes = {
  max: RFValue(40),
  veryVeryBig: RFValue(30),
  veryBig: RFValue(18),
  big: RFValue(14),
  normal: RFValue(12),
  small: RFValue(10),
  verySmall: RFValue(8),

  // max: RFValue(40),
  // veryVeryBig: RFValue(30),
  // veryBig: RFValue(20),
  // big: RFValue(16),
  // normal: RFValue(14),
  // small: RFValue(12),
  // verySmall: RFValue(10),
};

export const fontSizes = {
  veryBig: RFValue(20),
  big: RFValue(16),
  normal: RFValue(14),
  littlenormal: RFValue(13),
  small: RFValue(12),
  littleSmall: RFValue(11),
  verySmall: RFValue(10),
};

// filter表示上方的筛选按钮
export const filterButtonSmall = {
  paddingVertical: 8,
  paddingHorizontal: 12,
  borderRadius: 16,
};

export const filterButtonVerySmall = {
  paddingVertical: 5,
  paddingHorizontal: 8,
  borderRadius: 10,
};

// featurebtn一般指主页或者二级页面的功能性按钮
export const featureButtonBig = {
  paddingVertical: 10,
  paddingHorizontal: 20,
  borderRadius: 5,
};

export const featureButtonNormal = {
  paddingVertical: 8,
  paddingHorizontal: 12,
  borderRadius: 4,
};

export const featureButtonSmall = {
  paddingVertical: 8,
  paddingHorizontal: 12,
  borderRadius: 4,
};

export const defaultView = {
  one: {
    flex: 1,
  },
  two: {
    flex: 2,
  },
  four: {
    flex: 4,
  },
};

export const commonStyles = StyleSheet.create({
  normalButton: {
    backgroundColor: colors.bgBlue,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5, // 圆角
    elevation: 5, // Android 阴影
    shadowColor: '#000', // iOS 阴影
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    flexDirection: 'row',
    alignItems: 'center',
  },
  view: {
    backgroundColor: colors.bgWhite, // 背景颜色
  },
  normalText: {
    color: colors.bgWhite,
    fontSize: fontSizes.normal,
    textAlign: 'center',
  },
  smallText: {
    color: colors.bgWhite,
    fontSize: fontSizes.small,
    textAlign: 'center',
  },
  warnColor: {
    color: colors.fontColorRed,
  },
});
