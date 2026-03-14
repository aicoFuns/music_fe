declare module 'react-native-modal' {
  import { Component } from 'react';
  import { ViewStyle } from 'react-native';

  export interface ModalProps {
    isVisible: boolean;
    style?: ViewStyle;
    onRequestClose?: () => void;
    onBackdropPress?: () => void;
    onBackButtonPress?: () => void;
    animationIn?: string;
    animationOut?: string;
    children?: React.ReactNode;
    [key: string]: unknown;
  }

  export default class Modal extends Component<ModalProps> {}
}
