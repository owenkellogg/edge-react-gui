import { Disklet } from 'disklet'
import {
  EdgeAccount,
  EdgeContext,
  EdgeCurrencyWallet,
  EdgeDenomination,
  EdgeLobby,
  EdgeParsedUri,
  EdgeReceiveAddress,
  EdgeSpendInfo,
  EdgeTransaction
} from 'edge-core-js'

import { PriceChangeNotificationSettings } from '../actions/NotificationActions'
import { SortOption } from '../components/modals/WalletListSortModal'
import { ActionQueueAction } from '../controllers/action-queue/redux/actions'
import { LoanManagerActions } from '../controllers/loan-manager/redux/actions'
import { CcWalletMap } from '../reducers/FioReducer'
import { PermissionsState } from '../reducers/PermissionsReducer'
import { AccountActivationPaymentInfo, HandleActivationInfo, HandleAvailableStatus } from '../reducers/scenes/CreateWalletReducer'
import { AccountInitPayload, SettingsState } from '../reducers/scenes/SettingsReducer'
import { TweakSource } from '../util/ReferralHelpers'
import { DeepLink } from './DeepLinkTypes'
import { AccountReferral, DeviceReferral, Promotion, ReferralCache } from './ReferralTypes'
import {
  FioAddress,
  FioDomain,
  FioObtRecord,
  GuiContact,
  GuiCurrencyInfo,
  GuiExchangeRates,
  GuiMakeSpendInfo,
  GuiSwapInfo,
  MostRecentWallet,
  SpendAuthType,
  SpendingLimits,
  TransactionListTx,
  WalletListItem
} from './types'

// Actions with no payload:
type NoDataActionName =
  | 'CLOSE_SELECT_USER'
  | 'DEEP_LINK_HANDLED'
  | 'DEVELOPER_MODE_OFF'
  | 'DEVELOPER_MODE_ON'
  | 'DISABLE_SCAN'
  | 'DONE_SHIFT_TRANSACTION'
  | 'DUMMY_ACTION_PLEASE_IGNORE'
  | 'EDGE_LOBBY_ACCEPT_FAILED'
  | 'ENABLE_SCAN'
  | 'FIO/SET_FIO_ADDRESSES_PROGRESS'
  | 'INVALIDATE_EDGE_LOBBY'
  | 'OPEN_SELECT_USER'
  | 'OTP_ERROR_SHOWN'
  | 'PASSWORD_REMINDER_MODAL/CHECK_PASSWORD_SUCCESS'
  | 'PASSWORD_REMINDER_MODAL/REQUEST_CHANGE_PASSWORD'
  | 'PASSWORD_REMINDER/PASSWORD_REMINDER_POSTPONED'
  | 'PASSWORD_USED'
  | 'PROCESS_EDGE_LOGIN'
  | 'RECEIVED_INSUFFICIENT_FUNDS_ERROR'
  | 'SHIFT_COMPLETE'
  | 'START_CALC_MAX'
  | 'START_SHIFT_TRANSACTION'
  | 'UI/SEND_CONFIRMATION/RESET'
  | 'UI/SEND_CONFIRMATION/TOGGLE_CRYPTO_ON_TOP'
  | 'USE_LEGACY_REQUEST_ADDRESS'
  | 'USE_REGULAR_REQUEST_ADDRESS'
  | 'FIO/EXPIRED_REMINDER_SHOWN'

export type Action =
  | { type: NoDataActionName }
  // Actions with known payloads:
  | { type: 'ACCOUNT_ACTIVATION_INFO'; data: HandleActivationInfo }
  | { type: 'ACCOUNT_ACTIVATION_PAYMENT_INFO'; data: AccountActivationPaymentInfo }
  | { type: 'ACCOUNT_INIT_COMPLETE'; data: AccountInitPayload }
  | { type: 'ACCOUNT_REFERRAL_LOADED'; data: { referral: AccountReferral; cache: ReferralCache } }
  | { type: 'ACCOUNT_SWAP_IGNORED'; data: boolean }
  | { type: 'ACCOUNT_TWEAKS_REFRESHED'; data: ReferralCache }
  | {
      type: 'CORE/CONTEXT/ADD_CONTEXT'
      data: { context: EdgeContext; disklet: Disklet }
    }
  | {
      type: 'CORE/WALLETS/UPDATE_WALLETS'
      data: {
        currencyWallets: { [id: string]: EdgeCurrencyWallet }
      }
    }
  | { type: 'DEEP_LINK_RECEIVED'; data: DeepLink }
  | { type: 'DEVICE_REFERRAL_LOADED'; data: DeviceReferral }
  | { type: 'EXCHANGE_RATES/UPDATE_EXCHANGE_RATES'; data: { exchangeRates: GuiExchangeRates } }
  | {
      type: 'INSERT_WALLET_IDS_FOR_PROGRESS'
      data: { activeWalletIds: string[] }
    }
  | { type: 'IS_CHECKING_HANDLE_AVAILABILITY'; data: boolean }
  | { type: 'LOGIN'; data: { account: EdgeAccount; walletSort: SortOption } }
  | { type: 'LOGOUT'; data: { username?: string } }
  | { type: 'MESSAGE_TWEAK_HIDDEN'; data: { messageId: string; source: TweakSource } }
  | { type: 'PERMISSIONS/UPDATE'; data: Partial<PermissionsState> }
  | { type: 'PRICE_CHANGE_NOTIFICATIONS_UPDATE'; data: PriceChangeNotificationSettings }
  | { type: 'PROMOTION_ADDED'; data: Promotion }
  | { type: 'PROMOTION_REMOVED'; data: string /* installerId */ }
  | { type: 'HANDLE_AVAILABLE_STATUS'; data: HandleAvailableStatus }
  | {
      type: 'SELECT_FROM_WALLET_CRYPTO_EXCHANGE' | 'SELECT_TO_WALLET_CRYPTO_EXCHANGE'
      data: {
        balanceMessage: string
        currencyCode: string
        primaryInfo: GuiCurrencyInfo
        walletId: string
      }
    }
  | { type: 'CONTACTS/LOAD_CONTACTS_SUCCESS'; data: { contacts: GuiContact[] } }
  | { type: 'GENERIC_SHAPE_SHIFT_ERROR'; data: string }
  | { type: 'NEW_RECEIVE_ADDRESS'; data: { receiveAddress: EdgeReceiveAddress } }
  | { type: 'PARSE_URI_SUCCEEDED'; data: { parsedUri: EdgeParsedUri } }
  | { type: 'RESET_WALLET_LOADING_PROGRESS'; data: { walletId: string } }
  | { type: 'SAVE_EDGE_LOBBY'; data: EdgeLobby }
  | { type: 'SET_LOBBY_ERROR'; data: string }
  | { type: 'SET_FROM_WALLET_MAX'; data: string }
  | { type: 'SET_TRANSACTION_SUBCATEGORIES'; data: { subcategories: string[] } }
  | { type: 'SPENDING_LIMITS/NEW_SPENDING_LIMITS'; data: { spendingLimits: SpendingLimits } }
  | {
      type: 'UI/SCENES/TRANSACTION_LIST/UPDATE_TRANSACTIONS'
      data: {
        numTransactions: number
        transactions: TransactionListTx[]
        transactionIdMap: { [txid: string]: TransactionListTx }
        currentCurrencyCode: string
        currentWalletId: string
        currentEndIndex: number
      }
    }
  | { type: 'UI/SEND_CONFIRMATION/NEW_PIN'; data: { pin: string } }
  | {
      type: 'UI/SEND_CONFIRMATION/NEW_SPEND_INFO'
      data: {
        spendInfo: EdgeSpendInfo
        authRequired: SpendAuthType
      }
    }
  | {
      type: 'UI/SEND_CONFIRMATION/UPDATE_TRANSACTION'
      data: {
        error: Error | null
        forceUpdateGui: boolean
        guiMakeSpendInfo: GuiMakeSpendInfo
        transaction: EdgeTransaction | null
      }
    }
  | {
      type: 'UI/SEND_CONFIRMATION/SET_MAX_SPEND'
      data: boolean
    }
  | { type: 'UI/SETTINGS/CHANGE_TOUCH_ID_SETTINGS'; data: { isTouchEnabled: boolean } }
  | { type: 'UI/SETTINGS/SET_ACCOUNT_BALANCE_VISIBILITY'; data: { isAccountBalanceVisible: boolean } }
  | { type: 'UI/SETTINGS/SET_AUTO_LOGOUT_TIME'; data: { autoLogoutTimeInSeconds: number } }
  | { type: 'UI/SETTINGS/SET_DEFAULT_FIAT'; data: { defaultFiat: string } }
  | { type: 'UI/SETTINGS/SET_DENOMINATION_KEY'; data: { pluginId: string; currencyCode: string; denomination: EdgeDenomination } }
  | { type: 'UI/SETTINGS/SET_MOST_RECENT_WALLETS'; data: { mostRecentWallets: MostRecentWallet[] } }
  | { type: 'UI/SETTINGS/SET_PREFERRED_SWAP_PLUGIN'; data: string | undefined }
  | { type: 'UI/SETTINGS/SET_SETTINGS_LOCK'; data: boolean }
  | { type: 'UI/SETTINGS/SET_WALLETS_SORT'; data: { walletsSort: SortOption } }
  | { type: 'UI/SETTINGS/TOGGLE_PIN_LOGIN_ENABLED'; data: { pinLoginEnabled: boolean } }
  | { type: 'UI/SETTINGS/UPDATE_SETTINGS'; data: { settings: SettingsState } }
  | {
      type: 'UI/WALLETS/SELECT_WALLET'
      data: { currencyCode: string; walletId: string }
    }
  | { type: 'UI/WALLETS/UPSERT_WALLETS'; data: { wallets: EdgeCurrencyWallet[] } }
  | { type: 'UPDATE_SORTED_WALLET_LIST'; data: WalletListItem[] }
  | { type: 'UPDATE_SWAP_QUOTE'; data: GuiSwapInfo }
  | { type: 'UPDATE_SHOW_PASSWORD_RECOVERY_REMINDER_MODAL'; data: number }
  | { type: 'UPDATE_WALLET_LOADING_PROGRESS'; data: { walletId: string; addressLoadingProgress: number } }
  | { type: 'WALLET_ACCOUNT_ACTIVATION_ESTIMATE_ERROR'; data: string }
  | { type: 'NETWORK/NETWORK_STATUS'; data: { isConnected: boolean } }
  | { type: 'FIO/SET_FIO_ADDRESSES'; data: { fioAddresses: FioAddress[] } }
  | { type: 'FIO/UPDATE_CONNECTED_WALLETS'; data: { connectedWalletsByFioAddress: { [fioAddress: string]: CcWalletMap } } }
  | { type: 'FIO/UPDATE_CONNECTED_WALLETS_FOR_FIO_ADDRESS'; data: { fioAddress: string; ccWalletMap: CcWalletMap } }
  | { type: 'FIO/SET_OBT_DATA'; data: FioObtRecord[] }
  | { type: 'FIO/SET_FIO_DOMAINS'; data: { fioDomains: FioDomain[] } }
  | { type: 'FIO/SET_LAST_EXPIRED_CHECKS'; data: { [fioName: string]: Date } }
  | { type: 'FIO/CHECKING_EXPIRED'; data: boolean }
  | { type: 'FIO/WALLETS_CHECKED_FOR_EXPIRED'; data: { [walletId: string]: boolean } }
  /*
   Self-Contained Package Actions:

   All GUI-wide or global actions should be written inline above, but for any
   self-contained code (or package of code), it may isolate the types within
   the codebase's directory. Although, all of redux is global state, this
   is a way of isolating by convention some state which may only be managed
   by the package.
   */
  | ActionQueueAction
  | LoanManagerActions
