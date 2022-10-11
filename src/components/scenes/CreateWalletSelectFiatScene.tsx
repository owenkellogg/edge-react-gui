import * as React from 'react'
import { FlatList, ListRenderItemInfo, View } from 'react-native'
import FastImage from 'react-native-fast-image'
import IonIcon from 'react-native-vector-icons/Ionicons'
import { sprintf } from 'sprintf-js'

import { createNewWalletsAndTokens } from '../../actions/CreateWalletActions'
import { FIAT_COUNTRY } from '../../constants/CountryConstants'
import { SPECIAL_CURRENCY_INFO } from '../../constants/WalletAndCurrencyConstants'
import { useHandler } from '../../hooks/useHandler'
import { useWatch } from '../../hooks/useWatch'
import s from '../../locales/strings'
import { getDefaultFiat } from '../../selectors/SettingsSelectors'
import { useDispatch, useSelector } from '../../types/reactRedux'
import { NavigationProp, RouteProp } from '../../types/routerTypes'
import { GuiFiatType } from '../../types/types'
import { getWalletName } from '../../util/CurrencyWalletHelpers'
import { getSupportedFiats } from '../../util/utils'
import { SceneWrapper } from '../common/SceneWrapper'
import { ButtonsModal } from '../modals/ButtonsModal'
import { FiatListModal } from '../modals/FiatListModal'
import { TextInputModal } from '../modals/TextInputModal'
import { Airship } from '../services/AirshipInstance'
import { cacheStyles, Theme, useTheme } from '../services/ThemeContext'
import { CreateWalletSelectCryptoRow } from '../themed/CreateWalletSelectCryptoRow'
import { EdgeText } from '../themed/EdgeText'
import { MainButton } from '../themed/MainButton'
import { SceneHeader } from '../themed/SceneHeader'
import { SelectableRow } from '../themed/SelectableRow'
import { WalletCreateItem } from '../themed/WalletList'

type OwnProps = {
  navigation: NavigationProp<'createWalletSelectFiat'>
  route: RouteProp<'createWalletSelectFiat'>
}

type Props = OwnProps

const CreateWalletSelectFiatComponent = (props: Props) => {
  const { navigation, route } = props
  const { createWalletList } = route.params

  const dispatch = useDispatch()
  const theme = useTheme()
  const styles = getStyles(theme)

  const account = useSelector(state => state.core.account)
  const currencyWallets = useWatch(account, 'currencyWallets')

  const defaultFiat = useSelector(state => getDefaultFiat(state))
  const [fiat, setFiat] = React.useState(getSupportedFiats(defaultFiat)[0])

  const defaultWalletNames = React.useMemo(
    () =>
      createWalletList.reduce<{ [key: string]: string }>((map, item) => {
        map[item.key] = sprintf(s.strings.my_crypto_wallet_name, item.displayName)
        return map
      }, {}),
    [createWalletList]
  )

  const [walletNames, setWalletNames] = React.useState(defaultWalletNames)

  const handleEditWalletName = useHandler(async (key: string, currentName: string) => {
    const newName = await Airship.show<string | undefined>(bridge => (
      <TextInputModal
        autoCorrect={false}
        bridge={bridge}
        initialValue={currentName}
        inputLabel={s.strings.fragment_wallets_rename_wallet}
        returnKeyType="go"
        title={s.strings.fragment_wallets_rename_wallet}
      />
    ))
    if (newName != null) setWalletNames({ ...walletNames, [key]: newName })
  })

  const handleCreate = useHandler(async () => {
    await dispatch(createNewWalletsAndTokens(createWalletList, walletNames, fiat.value))
    navigation.navigate('walletListScene', {})
  })

  const handleImport = useHandler(async () => {
    // Create copy that we can mutate
    const createWalletListCopy = [...createWalletList]

    // Remove items that cannot be imported
    const importNotSupportedItems: WalletCreateItem[] = []
    for (let i = createWalletListCopy.length - 1; i >= 0; i--) {
      if (typeof SPECIAL_CURRENCY_INFO[createWalletListCopy[i].pluginId].isImportKeySupported !== 'object') {
        const removedItem = createWalletListCopy.splice(i, 1)
        importNotSupportedItems.push(removedItem[0])
      }
    }

    // Check if any remaining selected assets can be imported
    if (createWalletListCopy.length === 0) {
      await Airship.show<'cancel' | undefined>(bridge => (
        <ButtonsModal
          bridge={bridge}
          title={s.strings.create_wallet_failed_import_header}
          message={s.strings.create_wallet_all_disabled_import}
          buttons={{
            cancel: { label: s.strings.string_cancel_cap }
          }}
        />
      ))

      return
    }

    // Show warning that some assets cannot be imported
    if (importNotSupportedItems.length > 0) {
      const displayNames = importNotSupportedItems.map(item => item.displayName).join(', ')
      const resolveValue = await Airship.show<'continue' | 'cancel' | undefined>(bridge => (
        <ButtonsModal
          bridge={bridge}
          title={s.strings.create_wallet_failed_import_header}
          message={sprintf(s.strings.create_wallet_some_disabled_import, displayNames)}
          buttons={{
            continue: { label: s.strings.legacy_address_modal_continue },
            cancel: { label: s.strings.string_cancel_cap }
          }}
        />
      ))

      if (resolveValue === 'cancel' || resolveValue == null) {
        return
      }
    }

    // If all remaining create items are tokens just go enable them
    if (createWalletListCopy.every(item => item.createWalletIds != null)) {
      await dispatch(createNewWalletsAndTokens(createWalletList, walletNames, fiat.value))
      navigation.navigate('walletListScene', {})
      return
    }

    navigation.navigate('createWalletImport', { createWalletList: createWalletListCopy, walletNames, fiatCode: fiat.value })
  })

  const renderSelectedFiatRow = useHandler(() => {
    const fiatCountry = FIAT_COUNTRY[fiat.value]
    // @ts-expect-error
    const subTitle = s.strings[`currency_label_${fiat.value}`] ?? s.strings.currency_label_

    return (
      <SelectableRow
        icon={fiatCountry.logoUrl ? <FastImage source={{ uri: fiatCountry.logoUrl }} style={styles.cryptoTypeLogo} /> : <View style={styles.cryptoTypeLogo} />}
        paddingRem={[0, 1]}
        subTitle={subTitle}
        title={fiat.value}
        onPress={renderSelectFiatTypeModal}
      />
    )
  })

  const renderSelectFiatTypeModal = useHandler(async () => {
    const fiat = await Airship.show<GuiFiatType>(bridge => <FiatListModal bridge={bridge} />)
    if (fiat != null) setFiat(fiat)
  })

  const renderCurrencyRow = useHandler((data: ListRenderItemInfo<WalletCreateItem>) => {
    const { key, pluginId, tokenId, walletType, createWalletIds } = data.item

    if (walletType != null) {
      // New mainchain wallet
      const walletName = walletNames[key]
      const chevron = <IonIcon size={theme.rem(1.5)} color={theme.iconTappable} name="chevron-forward-outline" />

      return (
        <CreateWalletSelectCryptoRow
          pluginId={pluginId}
          walletName={walletName}
          onPress={async () => handleEditWalletName(key, walletName)}
          rightSide={chevron}
        />
      )
    } else if (createWalletIds != null && createWalletIds.length === 1 && createWalletIds[0] !== 'NEW_WALLET_UNIQUE_STRING') {
      // Token added to existing wallet
      const walletName = getWalletName(currencyWallets[createWalletIds[0]])

      return <CreateWalletSelectCryptoRow pluginId={pluginId} tokenId={tokenId} walletName={walletName} />
    } else {
      // Token added to new wallet
      const newWalletItem = createWalletList.find(item => item.pluginId === pluginId && item.walletType != null)
      if (newWalletItem == null) return null
      const walletName = walletNames[newWalletItem.key]

      return <CreateWalletSelectCryptoRow pluginId={pluginId} tokenId={tokenId} walletName={walletName} />
    }
  })

  return (
    <SceneWrapper avoidKeyboard background="theme">
      <View style={styles.content}>
        <SceneHeader withTopMargin title={s.strings.title_create_wallet} />
        {renderSelectedFiatRow()}
        <EdgeText style={styles.instructionalText} numberOfLines={1}>
          {s.strings.fragment_create_wallet_instructions}
        </EdgeText>
        <FlatList
          style={styles.resultList}
          automaticallyAdjustContentInsets={false}
          data={createWalletList}
          keyExtractor={item => item.key}
          renderItem={renderCurrencyRow}
        />
        <MainButton label={s.strings.title_create_wallets} type="secondary" marginRem={[0.5, 0.5, 0]} onPress={handleCreate} alignSelf="center" />
        <MainButton label={s.strings.create_wallet_imports_title} type="escape" marginRem={[0.5, 0.5, 1]} onPress={handleImport} alignSelf="center" />
      </View>
    </SceneWrapper>
  )
}

const getStyles = cacheStyles((theme: Theme) => ({
  content: {
    flex: 1
  },
  resultList: {
    flex: 1
  },
  cryptoTypeLogo: {
    width: theme.rem(2),
    height: theme.rem(2),
    borderRadius: theme.rem(1),
    marginLeft: theme.rem(0.25),
    backgroundColor: theme.backgroundGradientColors[1]
  },
  instructionalText: {
    fontSize: theme.rem(0.75),
    color: theme.primaryText,
    paddingBottom: theme.rem(0.5),
    paddingHorizontal: theme.rem(1),
    textAlign: 'left'
  }
}))

export const CreateWalletSelectFiatScene = React.memo(CreateWalletSelectFiatComponent)
