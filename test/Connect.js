import { expect, assert } from 'chai'
import { Connect } from './uport-connect'
// import { Credentials, SimpleSigner } from 'uport'
import { openQr, closeQr } from '../src/util/qrdisplay'
// import MockDate from 'mockdate'
// MockDate.set(1485321133996)
const JWT = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJFUzI1NksifQ.eyJyZXF1ZXN0ZWQiOlsibmFtZSIsInBob25lIl0sImlzcyI6IjB4MDAxMTIyIiwiaWF0IjoxNDg1MzIxMTMzOTk2fQ.zxGLQKo2WjgefrxEQWfwm_oago8Qr4YctBJoqNAm2XKE-48bADjolSo2T_tED9LnSikxqFIM9gNGpNgcY8JPdg'
const CONTRACT = '0x819320ce2f72768054ac01248734c7d4f9929f6c'
const UPORT_ID = '0x3b2631d8e15b145fd2bf99fc5f98346aecdc394c'
const CLIENT_ID = '0xa19320ce2f72768054ac01248734c7d4f9929f6d'
const FAKETX = '0x21893aaa10bb28b5893bcec44b33930c659edcd2f3f08ad9f3e69d8997bef238'

const publicKey = '03fdd57adec3d438ea237fe46b33ee1e016eda6b585c3e27ea66686c2ea5358479'
const PROFILE = {publicKey, name: 'David Chaum', address: '0x3b2631d8e15b145fd2bf99fc5f98346aecdc394c'}

function mockCredentials (receive) {
  return {
    settings: {},
    receive
  }
}
// const registry = (address) => new Promise((resolve, reject) => { console.log(`registry: ${address}`); resolve(address === '0x3b2631d8e15b145fd2bf99fc5f98346aecdc394c' ? profileA : null) })
// const credentials = new Credentials({signer, address: '0xa19320ce2f72768054ac01248734c7d4f9929f6d', registry})

const mockTopic = (response = UPORT_ID) => {
  return {
    stop: () => {},
    listen: () => (new Promise((resolve, reject) => resolve(response))),
    url: 'https://chasqui.uport.me/api/v1/topic/123'
  }
}

const errorTopic = () => {
  return {
    stop: () => {},
    listen: () => (new Promise((resolve, reject) => reject(new Error('It broke')))),
    url: 'https://chasqui.uport.me/api/v1/topic/123'
  }
}

describe('Connect', ()=> {
  describe('config', () => {
    it('defaults', () => {
      const uport = new Connect('test app')
      expect(uport.appName).to.equal('test app')
      expect(uport.infuraApiKey).to.equal('test-app')
      expect(uport.rpcUrl).to.equal('https://ropsten.infura.io/test-app')
      expect(uport.uriHandler.name).to.equal('openQr')
      expect(uport.closeUriHandler.name).to.equal('closeQr')
    })

    it('does not have a closeUriHandler if not using built in openQr', () => {
      const noop = (uri) => null
      const uport = new Connect('test', {uriHandler: noop})
      expect(uport.uriHandler).to.equal(noop)
      expect(uport.closeUriHandler).to.be.undefined
    })
  })

  describe('request', () => {
    const uri = 'me.uport:me'

    it('defaults to the preset uriHandler', (done) => {
      let opened, closed
      const uport = new Connect('UportTests', {
        uriHandler: (_uri) => {
          expect(_uri).to.equal(uri)
          opened = true
        },
        closeUriHandler: () => { closed = true }
      })
      uport.request({topic: mockTopic(), uri}).then(response => {
        expect(response).to.equal(UPORT_ID)
        expect(opened).to.equal(true)
        expect(closed).to.equal(true)
        done()
      }, error => {
        assert.fail()
        done()
      })
    })

    it('works fine without a closeUriHandler', (done) => {
      let opened
      const uport = new Connect('UportTests', {
        uriHandler: (_uri) => {
          expect(_uri).to.equal(uri)
          opened = true
        }
      })
      uport.request({topic: mockTopic(), uri}).then(response => {
        expect(response).to.equal(UPORT_ID)
        expect(opened).to.equal(true)
        done()
      }, error => {
        assert.fail()
        done()
      })
    })

    it('can be overriden by a passed in uriHandler', (done) => {
      let opened, closed
      const uport = new Connect('UportTests', {
        uriHandler: (_uri) => {
          assert.fail()
          done()
        },
        closeUriHandler: () => { closed = true }
      })
      uport.request({
        uri,
        topic: mockTopic(),
        uriHandler: (_uri) => {
          expect(_uri).to.equal(uri)
          opened = true
        }
      }).then(response => {
        expect(response).to.equal(UPORT_ID)
        expect(opened).to.equal(true)
        expect(closed).to.equal(true)
        done()
      }, error => {
        assert.fail()
        done()
      })
    })

    it('uses the preset mobileUriHandler', (done) => {
      let opened, closed
      const uport = new Connect('UportTests', {
        isMobile: true,
        mobileUriHandler: (_uri) => {
          expect(_uri).to.equal(uri)
          opened = true
        },
        closeUriHandler: () => { closed = true }
      })
      uport.request({
        uri,
        topic: mockTopic()
      }).then(response => {
        expect(response).to.equal(UPORT_ID)
        expect(opened).to.equal(true)
        expect(closed).to.equal(true)
        done()
      }, error => {
        assert.fail()
        done()
      })
    })

    it('uses the preset mobileUriHandler even if there is a local override', (done) => {
      let opened, closed
      const uport = new Connect('UportTests', {
        isMobile: true,
        mobileUriHandler: (_uri) => {
          expect(_uri).to.equal(uri)
          opened = true
        },
        closeUriHandler: () => { closed = true }
      })
      uport.request({
        uri,
        topic: mockTopic(),
        uriHandler: (_uri) => {
          assert.fail()
          done()
        }
      }).then(response => {
        expect(response).to.equal(UPORT_ID)
        expect(opened).to.equal(true)
        expect(closed).to.equal(true)
        done()
      }, error => {
        assert.fail()
        done()
      })
    })

    it('remembers to close if there is an error on the topic', (done) => {
      let opened, closed
      const uport = new Connect('UportTests', {
        uriHandler: (_uri) => {
          expect(_uri).to.equal(uri)
          opened = true
        },
        closeUriHandler: () => { closed = true }
      })
      uport.request({topic: errorTopic(), uri}).then(response => {
        assert.fail()
        done()
      }, error => {
        expect(error.message).to.equal('It broke')
        expect(opened).to.equal(true)
        expect(closed).to.equal(true)
        done()
      })
    })

  })

  describe('requestCredentials', () => {
    it('returns profile', (done) => {
      const uport = new Connect('UportTests', {
        clientId: CLIENT_ID,
        topicFactory: (name) => {
          expect(name).to.equal('access_token')
          return mockTopic(JWT)
        },
        uriHandler: (uri) => {
          expect(uri).to.equal(`me.uport:me?label=UportTests&callback_url=https%3A%2F%2Fchasqui.uport.me%2Fapi%2Fv1%2Ftopic%2F123&client_id=${CLIENT_ID}`)
        },
        credentials: mockCredentials((jwt) => {
          expect(JWT).to.equal(JWT)
          return PROFILE
        }),
        closeUriHandler: () => null
      })
      uport.requestCredentials().then(profile => {
        expect(profile).to.equal(PROFILE)
        done()
      }, error => {
        console.err(error)
        done()
      })
    })
  })

  describe('requestAddress', () => {
    it('returns address', (done) => {
      const uport = new Connect('UportTests', {
        clientId: CLIENT_ID,
        topicFactory: (name) => {
          expect(name).to.equal('access_token')
          return mockTopic(JWT)
        },
        uriHandler: (uri) => {
          expect(uri).to.equal(`me.uport:me?label=UportTests&callback_url=https%3A%2F%2Fchasqui.uport.me%2Fapi%2Fv1%2Ftopic%2F123&client_id=${CLIENT_ID}`)
        },
        credentials: mockCredentials((jwt) => {
          expect(JWT).to.equal(JWT)
          return PROFILE
        }),
        closeUriHandler: () => null
      })
      uport.requestAddress().then(address => {
        expect(address).to.equal(UPORT_ID)
        done()
      }, error => {
        console.err(error)
        done()
      })
    })
  })

  describe('sendTransaction', () => {
    it('shows simple value url', (done) => {
      const uport = new Connect('UportTests', {
        clientId: CLIENT_ID,
        topicFactory: (name) => {
          expect(name).to.equal('tx')
          return mockTopic(FAKETX)
        },
        uriHandler: (uri) => {
          expect(uri).to.equal(`me.uport:0x819320ce2f72768054ac01248734c7d4f9929f6c?value=255&label=UportTests&callback_url=https%3A%2F%2Fchasqui.uport.me%2Fapi%2Fv1%2Ftopic%2F123&client_id=${CLIENT_ID}`)
        },
        closeUriHandler: () => null
      })
      uport.sendTransaction({to: CONTRACT, value: '0xff'}).then(txhash => {
        expect(txhash).to.equal(FAKETX)
        done()
      })
    })

    it('shows simple url with function', (done) => {
      const uport = new Connect('UportTests', {
        clientId: CLIENT_ID,
        topicFactory: (name) => {
          expect(name).to.equal('tx')
          return mockTopic(FAKETX)
        },
        uriHandler: (uri) => {
          // Note it intentionally leaves out data as function overrides it
          // gas is not included in uri
          expect(uri).to.equal(`me.uport:0x819320ce2f72768054ac01248734c7d4f9929f6c?value=255&function=transfer(address%200x3b2631d8e15b145fd2bf99fc5f98346aecdc394c%2Cuint%2012312)&label=UportTests&callback_url=https%3A%2F%2Fchasqui.uport.me%2Fapi%2Fv1%2Ftopic%2F123&client_id=0xa19320ce2f72768054ac01248734c7d4f9929f6d`)
        },
        closeUriHandler: () => null
      })
      uport.sendTransaction({
        to: CONTRACT,
        value: '0xff',
        data: 'abcdef01',
        gas: '0x4444',
        function: `transfer(address ${UPORT_ID},uint 12312)`
      }).then(txhash => {
        expect(txhash).to.equal(FAKETX)
        done()
      })
    })

    it('shows simple url with data', (done) => {
      const uport = new Connect('UportTests', {
        clientId: CLIENT_ID,
        topicFactory: (name) => {
          expect(name).to.equal('tx')
          return mockTopic('FAKETX')
        },
        uriHandler: (uri) => {
          // gas is not included in uri
          expect(uri).to.equal(`me.uport:0x819320ce2f72768054ac01248734c7d4f9929f6c?value=255&bytecode=abcdef01&label=UportTests&callback_url=https%3A%2F%2Fchasqui.uport.me%2Fapi%2Fv1%2Ftopic%2F123&client_id=${CLIENT_ID}`)
        },
        closeUriHandler: () => null
      })
      uport.sendTransaction({
        to: CONTRACT,
        value: '0xff',
        data: 'abcdef01',
        gas: '0x4444'
      }).then(txhash => {
        expect(txhash).to.equal('FAKETX')
        done()
      })
    })

    it('throws an error for contract transactions', () => {
      const uport = new Connect('UportTests', {
        uriHandler: (uri) => null,
        closeUriHandler: () => null
      })
      expect(
        () => uport.sendTransaction({
          value: '0xff',
          data: 'abcdef01',
          gas: '0x4444'
        })
      ).to.throw('Contract creation is not supported by uportProvider')
    })
  })
})
