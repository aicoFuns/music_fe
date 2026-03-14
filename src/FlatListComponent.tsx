import { StyleSheet, Text, View } from 'react-native';
import { colors, fontSizes } from './Common.styles';
import React from 'react';
export const Footer = () => {
  return (
    <View style={styles.footerView}>
      <Text style={styles.footerText}>-·- 你碰到我的底线了 -·-</Text>
    </View>
  );
};

export const EmptyList = () => {
  return (
    <View style={styles.emptyView}>
      <Text style={styles.emptyText}>-·- 别看了，这里什么都还没有 -·-</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  footerView: { padding: 10, alignItems: 'center' },
  footerText: { fontSize: fontSizes.small, color: colors.fontColorLightGray },
  emptyView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: fontSizes.small,
  },
});
