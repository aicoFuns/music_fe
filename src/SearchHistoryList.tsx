import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome6';
import useSearchHistoryStore from './global/useSearchHistoryStore';
import { isEmpty } from 'lodash';
import { fontSizes, iconSizes } from './Common.styles';

const SearchHistoryList = ({ handleClickHistory }) => {
  const history = useSearchHistoryStore(state => state.history);
  const deleteKeyword = useSearchHistoryStore(state => state.deleteKeyword);

  return (
    <View style={styles.container}>
      {!isEmpty(history) && <Text style={styles.header}>搜索历史</Text>}
      <View style={styles.gridContainer}>
        {history.map((keyword, index) => (
          <View key={index} style={styles.keywordContainer}>
            <Text
              style={styles.keywordText}
              onPress={() => {
                handleClickHistory(keyword);
              }}>
              {keyword}
            </Text>
            <TouchableOpacity onPress={() => deleteKeyword(String(keyword))}>
              <Icon
                name="xmark"
                color="red"
                size={iconSizes.normal}
                style={{ paddingTop: 2 }}
              />
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    backgroundColor: '#fff',
  },
  header: {
    fontSize: fontSizes.normal,
    //fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap', // 自动换行
    justifyContent: 'flex-start', // 左对齐
  },
  keywordContainer: {
    flexDirection: 'row', // 关键字和删除按钮横向排列
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    margin: 6,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 16, // 圆角边框
    backgroundColor: '#fff',
  },
  keywordText: {
    fontSize: fontSizes.small,
    marginRight: 4,
    color: '#333',
  },
  deleteIcon: {
    fontSize: fontSizes.verySmall,
    color: '#ff4d4f', // 红色删除按钮
  },
});

export default SearchHistoryList;
