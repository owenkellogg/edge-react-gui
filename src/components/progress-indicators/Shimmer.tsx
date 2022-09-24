import * as React from 'react'
import { View } from 'react-native'
import LinearGradient from 'react-native-linear-gradient'
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated'

import { useHandler } from '../../hooks/useHandler'
import { cacheStyles, Theme, useTheme } from '../services/ThemeContext'

type Props = {
  children?: React.ReactNode
  visible?: boolean
}

export const Shimmer = (props: Props) => {
  const { children = null, visible = true } = props

  const theme = useTheme()
  const styles = getStyles(theme)

  const offset = useSharedValue(-1000)

  const startAnimation = useHandler(() => {
    const duration = 1000
    offset.value = withRepeat(withSequence(withTiming(-1000, { duration }), withTiming(0, { duration })), -1, false)
  })

  React.useEffect(() => {
    startAnimation()
  }, [startAnimation])

  const animStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: offset.value }]
    }
  })

  return (
    <View>
      <View style={{ opacity: visible ? 0 : 1 }}>{children}</View>
      {visible ? (
        <View style={styles.container}>
          <Animated.View style={[styles.gradientContainer, animStyle]}>
            <LinearGradient style={styles.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} colors={['rgba(0,0,0,0)', theme.shimmerBackgroundHighlight]} />
            <LinearGradient style={styles.gradient} start={{ x: 1, y: 0 }} end={{ x: 0, y: 1 }} colors={['rgba(0,0,0,0)', theme.shimmerBackgroundHighlight]} />
          </Animated.View>
        </View>
      ) : null}
    </View>
  )
}

const getStyles = cacheStyles((theme: Theme) => ({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: theme.cardBorderRadius,
    backgroundColor: theme.shimmerBackgroundColor,
    overflow: 'hidden'
  },
  gradientContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 1000,
    bottom: 0,
    display: 'flex',
    flexDirection: 'row'
  },
  gradient: {
    flex: 1,
    width: '100%',
    height: '100%'
  }
}))
