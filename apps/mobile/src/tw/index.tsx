/**
 * Re-exports of react-native-css's pre-wrapped React Native components.
 *
 * These components are functionally identical to react-native's exports, but
 * they accept a `className` prop. We disable globalClassNamePolyfill in
 * metro.config.js, so all className usage MUST come through these components.
 *
 * Why re-export instead of `import { View } from 'react-native-css/components'`
 * everywhere? Single import surface + room for project-specific wrappers later.
 */
export {
  ActivityIndicator,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableHighlight,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  VirtualizedList,
  FlatList,
} from 'react-native-css/components';

export { useNativeVariable } from 'react-native-css';
