import { describe, expect, it } from '@jest/globals'
import * as React from 'react'
import { Provider } from 'react-redux'
import { createRenderer } from 'react-test-renderer/shallow'
import { createStore } from 'redux'

import { CreateWalletImportScene } from '../../components/scenes/CreateWalletImportScene'
import { getTheme } from '../../components/services/ThemeContext'
import { rootReducer } from '../../reducers/RootReducer'
import { fakeNavigation } from '../../util/fake/fakeNavigation'
import { fakeUser } from '../../util/fake-user'

describe('CreateWalletImportScene', () => {
  const mockState: any = {
    core: {
      account: {
        currencyConfigs: {
          bitcoin: {
            pluginId: 'bitcoin'
          }
        }
      }
    }
  }
  const store = createStore(rootReducer, mockState)

  it('should render with loading props', () => {
    const renderer = createRenderer()

    const props: any = {
      navigation: fakeNavigation,
      route: {
        name: 'createWalletImport',
        params: {
          createWalletList: [
            {
              key: `create-wallet:bitcoin-bip49-bitcoin`,
              currencyCode: 'BTC',
              displayName: 'Bitcoin',
              pluginId: 'bitcoin',
              walletType: 'wallet:bitcoin-bip49'
            }
          ],
          walletNames: { bitcoin: 'My Bitcoin' },
          fiatCode: 'USD'
        }
      },
      account: () => fakeUser,
      context: { apiKey: '', appId: '' }, // used  EdgeContextOptions
      theme: getTheme()
    }
    const actual = renderer.render(
      <Provider store={store}>
        <CreateWalletImportScene {...props} />
      </Provider>
    )

    expect(actual).toMatchSnapshot()
  })
})
