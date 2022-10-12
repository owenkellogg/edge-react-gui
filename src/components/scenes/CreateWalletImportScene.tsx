import { JsonObject } from 'edge-core-js'
import * as React from 'react'
import { View } from 'react-native'
import { sprintf } from 'sprintf-js'

import { createNewWalletsAndTokens, PLACEHOLDER_WALLET_ID, splitCreateWalletItems } from '../../actions/CreateWalletActions'
import ImportKeySvg from '../../assets/images/import-key-icon.svg'
import { useHandler } from '../../hooks/useHandler'
import { useLayout } from '../../hooks/useLayout'
import s from '../../locales/strings'
import { useDispatch, useSelector } from '../../types/reactRedux'
import { NavigationProp, RouteProp } from '../../types/routerTypes'
import { SceneWrapper } from '../common/SceneWrapper'
import { ButtonsModal } from '../modals/ButtonsModal'
import { Airship } from '../services/AirshipInstance'
import { cacheStyles, Theme, useTheme } from '../services/ThemeContext'
import { EdgeText } from '../themed/EdgeText'
import { MainButton } from '../themed/MainButton'
import { OutlinedTextInput } from '../themed/OutlinedTextInput'
import { SceneHeader } from '../themed/SceneHeader'
import { WalletCreateItem } from '../themed/WalletList'

type OwnProps = {
  navigation: NavigationProp<'createWalletImport'>
  route: RouteProp<'createWalletImport'>
}

type Props = OwnProps

const CreateWalletImportComponent = (props: Props) => {
  const { navigation, route } = props
  const { createWalletList, walletNames, fiatCode } = route.params
  const dispatch = useDispatch()
  const theme = useTheme()
  const styles = getStyles(theme)

  const account = useSelector(state => state.core.account)
  const { currencyConfig } = account

  const [importText, setImportText] = React.useState('')

  const handleNext = useHandler(async () => {
    const cleanImportText = importText.trim()

    // Test imports
    const { newWalletItems } = splitCreateWalletItems(createWalletList)

    const pluginIds = newWalletItems.map(item => item.pluginId)

    // Loop over plugin importPrivateKey
    const promises = pluginIds.map(
      async pluginId =>
        await currencyConfig[pluginId].importKey(cleanImportText).catch(e => {
          console.warn('importKey failed', e)
        })
    )

    const results = await Promise.all(promises)

    const successMap: { [pluginId: string]: JsonObject } = {}

    for (const [i, keys] of results.entries()) {
      if (typeof keys === 'object') {
        // Success
        successMap[pluginIds[i]] = keys
      }
    }

    // Split up the original list of create items into success and failure lists
    const failureItems: WalletCreateItem[] = []
    const successItems: WalletCreateItem[] = []

    for (const item of createWalletList) {
      if (successMap[item.pluginId] != null) {
        // Any asset associated to this pluginId is good to go
        successItems.push(item)
      } else if (item.createWalletIds != null && item.createWalletIds[0] !== PLACEHOLDER_WALLET_ID) {
        // Token items to be enabled on existing wallets and aren't dependent on a failed import are are good to go, too
        successItems.push(item)
      } else {
        // No good
        failureItems.push(item)
      }
    }

    if (successItems.length === 0) {
      const resolveValue = await Airship.show<'edit' | 'cancel' | undefined>(bridge => (
        <ButtonsModal
          bridge={bridge}
          title={s.strings.create_wallet_failed_import_header}
          message={s.strings.create_wallet_all_failed}
          buttons={{
            cancel: { label: s.strings.string_cancel_cap }
          }}
        />
      ))

      if (resolveValue === 'cancel') {
        navigation.navigate('walletListScene', {})
      }
      return
    }

    if (failureItems.length > 0) {
      // Show modal with errors
      const displayNames = failureItems.map(item => item.displayName).join(', ')
      const resolveValue = await Airship.show<'continue' | 'edit' | 'cancel' | undefined>(bridge => (
        <ButtonsModal
          bridge={bridge}
          title={s.strings.create_wallet_failed_import_header}
          message={sprintf(s.strings.create_wallet_some_failed, displayNames)}
          buttons={{
            continue: { label: s.strings.legacy_address_modal_continue },
            edit: { label: s.strings.create_wallet_edit },
            cancel: { label: s.strings.string_cancel_cap }
          }}
        />
      ))

      if (resolveValue === 'cancel') {
        navigation.navigate('walletListScene', {})
        return
      } else if (resolveValue === 'edit' || resolveValue == null) {
        return
      }
    }

    await dispatch(createNewWalletsAndTokens(successItems, walletNames, fiatCode, cleanImportText))
    navigation.navigate('walletListScene', {})
  })

  // Scale the icon to match the height of the first MainButton container for consistency
  const [iconContainerLayout, setIconContainerLayout] = useLayout()
  const svgHeightToWidthRatio = 62 / 58 // Original SVG height and width
  const svgHeight = iconContainerLayout.height
  const svgWidth = svgHeightToWidthRatio * svgHeight

  return (
    <SceneWrapper avoidKeyboard background="theme">
      <SceneHeader withTopMargin title={s.strings.create_wallet_import_title} />
      <View style={styles.icon}>
        <ImportKeySvg color={theme.iconTappable} height={svgHeight} width={svgWidth} />
      </View>
      <EdgeText style={styles.instructionalText} numberOfLines={2}>
        {s.strings.create_wallet_import_all_instructions}
      </EdgeText>
      <OutlinedTextInput
        value={importText}
        returnKeyType="next"
        label={s.strings.create_wallet_import_input_key_or_seed_prompt}
        autoCorrect={false}
        blurOnClear={false}
        onChangeText={setImportText}
        marginRem={[1, 0.75, 1.25]}
      />
      <View onLayout={setIconContainerLayout}>
        <MainButton label={s.strings.string_next_capitalized} type="secondary" marginRem={[0.5, 0.5]} onPress={handleNext} alignSelf="center" />
      </View>
    </SceneWrapper>
  )
}

const getStyles = cacheStyles((theme: Theme) => ({
  icon: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: theme.rem(1)
  },
  instructionalText: {
    fontSize: theme.rem(1),
    color: theme.primaryText,
    paddingHorizontal: theme.rem(1),
    marginTop: theme.rem(0.5),
    marginBottom: theme.rem(1),
    marginHorizontal: theme.rem(0.5),
    textAlign: 'center'
  }
}))

export const CreateWalletImportScene = React.memo(CreateWalletImportComponent)
