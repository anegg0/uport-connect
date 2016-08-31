/*
 * Autosigner is a simple class that uses lightwallet and acts as a QRDisplay
 * to automatically sign transactions from the uportProvider. This can be used
 * in order to create efficient tests.
 */
const Lightwallet = require('eth-lightwallet')
const Transaction = require('ethereumjs-tx')
const Web3 = require('web3')
const url = require('url')
const querystring = require('querystring')
const xhr = process.browser ? require('xhr') : require('request')

const PASSWORD = 'password'
const SEED = 'unhappy nerve cancel reject october fix vital pulse cash behind curious bicycle'

class Autosigner {

  constructor (rpcUrl, keystore, pwDerivedKey) {
    keystore.generateNewAddress(pwDerivedKey)
    this.address = '0x' + keystore.getAddresses()[0]
    this.keystore = keystore
    this.pwDerivedKey = pwDerivedKey
    this.web3 = new Web3(new Web3.providers.HttpProvider(rpcUrl))
  }

  static load (rpcUrl, cb) {
    Lightwallet.keystore.deriveKeyFromPassword(PASSWORD, (err, pwDerivedKey) => {
      if (err) cb(err)
      let KeystoreMethod = Lightwallet.keystore
      let Keystore = new KeystoreMethod(SEED, pwDerivedKey)
      let autosinger = new Autosigner(rpcUrl, Keystore, pwDerivedKey)
      cb(null, autosinger)
    })
  }

  openQr (data) {
    let res = Autosigner.parse(data)
    let body = {}
    if (res.to === 'me') {
      body.address = this.address
    } else {
      body.tx = this.sendTx(res)
    }
    setTimeout(
      Autosigner.postData.bind(null, res.callback_url, body),
      3000
    )
  }

  sendTx (params) {
    let signedTx = this.createAndSignTx(params)
    return this.web3.eth.sendRawTransaction(signedTx)
  }

  createAndSignTx (params) {
    let txObj = {
      gasPrice: 10000000000000,
      gasLimit: 3000000,
      nonce: this.web3.eth.getTransactionCount(this.address)
    }
    if (params.to) {
      txObj.to = params.to
    }
    if (params.value) {
      txObj.value = this.web3.toHex(params.value)
    }
    if (params.data) {
      txObj.data = params.data
    }
    let tx = new Transaction(txObj).serialize().toString('hex')
    return '0x' + Lightwallet.signing.signTx(this.keystore, this.pwDerivedKey, tx, this.address)
  }

  closeQr () {}

  static parse (uri) {
    let parsedUri = url.parse(uri)
    let parsedParams = querystring.parse(parsedUri.query)
    let result = {
      to: parsedUri.host,
      callback_url: parsedParams.callback_url,
      value: parsedParams.value,
      data: parsedParams.bytecode
    }
    if (result.to === 'create') {
      result.to = null
    }
    return result
  }

  static postData (url, body, cb) {
    if (!cb) cb = function () {}
    xhr({
      uri: url,
      method: 'POST',
      rejectUnautohorized: false,
      json: body
    }, cb)
  }
}

export default Autosigner
