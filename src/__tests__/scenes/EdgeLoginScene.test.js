/* globals describe it expect */
/* eslint-disable flowtype/require-valid-file-annotation */

// import * as React from 'react'
import ShallowRenderer from 'react-test-renderer/shallow'

// import { EdgeLoginScene } from '../../components/scenes/EdgeLoginScene'
// import { getTheme } from '../../components/services/ThemeContext.js'
// import { fakeNavigation } from '../../util/fake/fakeNavigation.js'

describe('EdgeLoginSceneComponent', () => {
  it('should render with loading props', () => {
    const renderer = new ShallowRenderer()

    // const props = {
    //   navigation: fakeNavigation,
    //   error: 'Not normal expected behavior',
    //   isProcessing: true,
    //   lobby: {
    //     loginRequest: {
    //       appId: '',
    //       approve: async () => undefined,
    //       displayName: 'myAccount',
    //       displayImageUrl: ''
    //     }
    //   },
    //   accept: () => undefined,

    //   theme: getTheme()
    // }
    expect(renderer).toBeDefined()
    // const actual = renderer.render(<EdgeLoginScene {...props} />)
    // expect(actual).toMatchSnapshot()
  })
})
