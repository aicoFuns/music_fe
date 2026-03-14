declare module 'react-native-vector-icons/FontAwesome6' {
  import { Component } from 'react';
  import { ImageStyle, TextStyle } from 'react-native';

  export interface IconProps {
    name: string;
    size?: number;
    color?: string;
    style?: ImageStyle | TextStyle;
    solid?: boolean;
    onPress?: () => void;
  }

  export default class Icon extends Component<IconProps> {}
}
