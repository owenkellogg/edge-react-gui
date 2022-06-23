// @flow

import * as React from 'react'
import { ActivityIndicator, View } from 'react-native'
import FastImage from 'react-native-fast-image'
import { sprintf } from 'sprintf-js'

import { lobbyLogin } from '../../actions/EdgeLoginActions.js'
import { useHandler } from '../../hooks/useHandler.js'
import s from '../../locales/strings.js'
import { config } from '../../theme/appConfig.js'
import { useDispatch, useSelector } from '../../types/reactRedux.js'
import { type NavigationProp } from '../../types/routerTypes.js'
import { SceneWrapper } from '../common/SceneWrapper.js'
import { type Theme, cacheStyles, useTheme } from '../services/ThemeContext'
import { TitleText } from '../text/TitleText'
import { Alert } from '../themed/Alert'
import { MainButton } from '../themed/MainButton.js'

type Props = {
  navigation: NavigationProp<'edgeLogin'>
}

export const EdgeLoginScene = (props: Props) => {
  const theme = useTheme()
  const styles = getStyles(theme)

  const { navigation } = props
  const error = useSelector(state => state.core.edgeLogin.error)
  const isProcessing = useSelector(state => state.core.edgeLogin.isProcessing)
  const lobby = useSelector(state => state.core.edgeLogin.lobby)
  const dispatch = useDispatch()

  const handlePress = useHandler(() => {
    navigation.navigate('waitScene', { message: s.strings.edge_login_fetching_message })
    dispatch(lobbyLogin()).then(() => {
      navigation.goBack()
    })
  })

  const renderBody = useHandler(() => {
    let message = error ?? ''

    if (!error) {
      message = sprintf(s.strings.access_wallet_description, config.appName)
    }

    if (!lobby && !error) {
      throw new Error('Not normal expected behavior')
    }
    if (lobby && lobby.loginRequest && lobby.loginRequest.appId === '') {
      message = sprintf(s.strings.edge_description_warning, lobby.loginRequest.displayName)
    }
    return (
      <View style={styles.warning}>
        <Alert title={s.strings.string_warning} message={message} type="warning" numberOfLines={6} style={styles.warning} />
      </View>
    )
  })

  const renderButtons = useHandler(() => {
    const handleDecline = () => navigation.goBack()
    if (isProcessing) {
      return (
        <View style={styles.buttonsProcessing}>
          <ActivityIndicator color={theme.primaryText} size="large" />
        </View>
      )
    }
    if (error) {
      return (
        <View style={styles.buttons}>
          <MainButton label={s.strings.string_cancel_cap} type="escape" onPress={handleDecline} />
        </View>
      )
    }
    return (
      <View style={styles.buttons}>
        <MainButton marginRem={[1, 0, 1, 0]} label={s.strings.accept_button_text} onPress={handlePress} />
        <MainButton label={s.strings.string_cancel_cap} type="escape" onPress={handleDecline} />
      </View>
    )
  })

  const renderImage = useHandler(() => {
    if (lobby && lobby?.loginRequest && lobby?.loginRequest?.displayImageUrl) {
      return <FastImage source={theme.primaryLogo} style={styles.logo} resizeMode="contain" />
    }
    return null
  })

  const renderHeader = useHandler(() => {
    let title = ''
    if (lobby && lobby.loginRequest) {
      title = lobby.loginRequest.displayName ? lobby.loginRequest.displayName : ''
    }
    if (lobby) {
      return (
        <View style={styles.header}>
          <TitleText style={styles.title}>{title}</TitleText>
        </View>
      )
    }
    return <View style={styles.header} />
  })

  if (!lobby && !error) {
    return (
      <SceneWrapper background="theme">
        <View style={styles.spinnerContainer}>
          <TitleText style={styles.spinnerText}>{s.strings.edge_login_fetching}</TitleText>
          <ActivityIndicator color={theme.primaryText} size="large" />
        </View>
      </SceneWrapper>
    )
  }
  return (
    <SceneWrapper background="theme">
      {renderImage()}
      {renderHeader()}
      {renderBody()}
      {renderButtons()}
    </SceneWrapper>
  )
}

const getStyles = cacheStyles((theme: Theme) => ({
  view: {
    flex: 2,
    flexDirection: 'column',
    justifyContent: 'flex-start'
  },
  logo: {
    marginVertical: theme.rem(2),
    height: theme.rem(3.25)
  },
  header: {
    display: 'flex',
    flexDirection: 'row',
    flex: 1,
    justifyContent: 'space-evenly'
  },
  title: {
    fontSize: theme.rem(1.25)
  },
  warning: {
    flex: 3
  },
  buttonContainer: {
    position: 'relative',
    flexDirection: 'column',
    width: '100%',
    justifyContent: 'flex-end'
  },
  buttons: {
    marginHorizontal: theme.rem(1),
    marginVertical: theme.rem(2)
  },
  spinnerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  spinnerText: {
    marginBottom: theme.rem(1)
  },
  loadingSpinner: {
    flex: 1,
    alignSelf: 'center'
  },
  buttonsProcessing: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  }
}))
