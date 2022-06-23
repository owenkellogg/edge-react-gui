// @flow

import LottieView from 'lottie-react-native'
import * as React from 'react'
import { View } from 'react-native'

import { type RouteProp } from '../../types/routerTypes.js'
import { SceneWrapper } from '../common/SceneWrapper.js'
import { type Theme, cacheStyles, useTheme } from '../services/ThemeContext'
import { EdgeText } from '../themed/EdgeText'
type Props = {
  message: string,
  route: RouteProp<'waitScene'>
}

export const WaitScene = (props: Props) => {
  const { message } = props.route.params

  const theme = useTheme()
  const styles = getStyles(theme)

  return (
    <SceneWrapper>
      <View style={styles.content}>
        <EdgeText style={styles.message} numberOfLines={2}>
          {message}
        </EdgeText>
        <View style={styles.spinner}>
          <LottieView source={require('../../assets/images/Donut-Placeholder-Lottie.json')} loop autoPlay />
        </View>
      </View>
    </SceneWrapper>
  )
}

const getStyles = cacheStyles((theme: Theme) => ({
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  message: {
    fontSize: theme.rem(2),
    marginBottom: theme.rem(2),
    marginHorizontal: theme.rem(2),
    textAlign: 'center'
  },
  spinner: {
    width: theme.rem(5),
    height: theme.rem(5)
  }
}))
