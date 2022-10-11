import { describe, expect, it } from '@jest/globals'
import * as React from 'react'
import { Provider } from 'react-redux'
import { createRenderer } from 'react-test-renderer/shallow'
import { createStore } from 'redux'

import { CreateWalletSelectFiatScene } from '../../components/scenes/CreateWalletSelectFiatScene'
import { getTheme } from '../../components/services/ThemeContext'
import { rootReducer } from '../../reducers/RootReducer'
import { fakeNavigation } from '../../util/fake/fakeNavigation'

describe('CreateWalletSelectFiatComponent', () => {
  const mockState: any = {
    ui: {
      settings: {
        defaultIsoFiat: 'USD'
      }
    }
  }
  const store = createStore(rootReducer, mockState)

  it('should render with loading props', () => {
    const renderer = createRenderer()

    const props: any = {
      navigation: fakeNavigation,
      route: {
        name: 'createWalletReview',
        params: {
          createWalletList: [
            {
              key: 'create-wallet:bitcoin-bip44-bitcoin',
              currencyCode: 'BTC',
              displayName: 'Bitcoin (no Segwit)',
              pluginId: 'bitcoin',
              walletType: 'wallet:bitcoin-bip44'
            },
            { key: 'create-wallet:ethereum-ethereum', currencyCode: 'ETH', displayName: 'Ethereum', pluginId: 'ethereum', walletType: 'wallet:ethereum' },
            {
              key: 'create-ethereum-9992ec3cf6a55b00978cddf2b27bc6882d88d1ec',
              currencyCode: 'POLY',
              displayName: 'Polymath Network',
              pluginId: 'ethereum',
              tokenId: '9992ec3cf6a55b00978cddf2b27bc6882d88d1ec',
              createWalletIds: ['bNBAI/Z4YE1h6qk1p28jhjGJwMiARqvZPfnAt6LyxkA=']
            }
          ]
        }
      },
      supportedFiats: [
        {
          label: '',
          value: ''
        }
      ],
      theme: getTheme()
    }
    const actual = renderer.render(
      <Provider store={store}>
        <CreateWalletSelectFiatScene {...props} />
      </Provider>
    )

    expect(actual).toMatchSnapshot()
  })
})
