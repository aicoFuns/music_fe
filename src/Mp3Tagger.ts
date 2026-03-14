import { NativeModules } from 'react-native';
console.log(NativeModules); // ← 看看里面有没有 Mp3Tagger
type Mp3TaggerType = {
  embedTag: (
    mp3Path: string,
    lyrics: string,
    imagePath: string,
  ) => Promise<string>;
};

const { Mp3Tagger } = NativeModules;

export default Mp3Tagger as Mp3TaggerType;
