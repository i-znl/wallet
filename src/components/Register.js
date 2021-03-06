import React, { Component, PureComponent } from 'react'

import { Form, Icon, Input, Button, message, Row, Col } from 'antd'
import BTFetch from '../utils/BTFetch'
import BTCryptTool from 'bottos-js-crypto'
import './styles.less'
import BTIpcRenderer from '../tools/BTIpcRenderer'
import {exportFile} from '../utils/BTUtil'
import {FormattedMessage} from 'react-intl'
import {isUserName} from '../tools/BTCheck'

import ConfirmButton from './ConfirmButton'
import messages from '../locales/messages'
import {messageProtoEncode} from '../lib/proto/index'
const msgpack = require('../lib/msgpack/msgpack')

const HeaderMessages = messages.Header;
const LoginMessages = messages.Login;
const FormItem = Form.Item;
const Keystore = BTCryptTool.keystore

function BTRegistSuccess(props) {
  function downloadKeystore() {
    BTIpcRenderer.exportKeyStore(props.username, props.cryptStr);
  }

  return (
    <div style={{textAlign: 'center'}}>
      <p style={{margin: '20px auto', fontSize: 16}}>
        <FormattedMessage {...HeaderMessages.YourAccountHasBeenRegisteredSuccessfully}/>
      </p>
      <Button type="primary" onClick={downloadKeystore}>
        <FormattedMessage {...HeaderMessages.BackupYourKeystore}/>
      </Button>
    </div>
  )
}


const formItemLayout = {
    labelCol: {
        xs: { span: 24 },
        sm: { span: 8 },
    },
    wrapperCol: {
        xs: { span: 24 },
        sm: { span: 16 },
    },
};

class Regist extends PureComponent{
    constructor(props){
        super(props);
        this.state = {
            user_type: 0,
            verify_data:'', // 验证码图片
            verify_id: '', // 验证码 id
            isRegistered: false,
            // 下面两个是 BTRegistSuccess 需要的参数
            username: '',
            cryptStr: ''
        }

        this.onHandleSubmit = this.onHandleSubmit.bind(this)
    }

    registSuccess({cryptStr, username}) {
        this.setState({
            isRegistered: true,
            cryptStr,
            username
        })
    }

    clearFields = () => {
        const {setFieldsValue} = this.props.form;

        setFieldsValue({
            username:'',
            password:'',
            newpassword:'',
            email:'',
            verificationCode:''
        })
    }

    async onHandleSubmit(e) {
        e.preventDefault()
        message.destroy();
        const { getFieldsValue } = this.props.form;
        let fieldValues = getFieldsValue()
        // 获取表单参数
        let username = fieldValues.username;

        // 检查username
        if(!isUserName(username)) {message.error(window.localeInfo["Header.UserNameIsNotRight"]);return}

        // let role_type = fieldValues.role_type;
        let email = fieldValues.email;
        let password = fieldValues.password;
        let surePassword = fieldValues.newpassword;
        let verificationCode = fieldValues.verificationCode;
        //新增参数
        let msg = fieldValues.msg;
        let phone = fieldValues.phone;
        let contacts = fieldValues.contacts;
        let contactsPhone = fieldValues.contactsPhone;

        // !(new RegExp(/^{8,}$/, "g").test(password))
        if(username==undefined){message.error(window.localeInfo["Header.PleaseEnterTheUserName"]); return}
        if(password==undefined){message.error(window.localeInfo["Header.PleaseEnterThePassword"]); return}
        else if(password.length < 8){
            message.error(window.localeInfo["Header.ThePasswordShouldContainAtLeast8BitCharacters"]);
            return;
        }
        if(password != surePassword){
            message.error(window.localeInfo["Header.IncorrectPasswordEnteredTwice"]);
            return;
        }

        // 判断验证码
        if(verificationCode==undefined){message.error(window.localeInfo["Header.PleaseEnterTheVerificationCode"]); return}
        let keys = BTCryptTool.createPubPrivateKeys()
        let privateKey = keys.privateKey
        let blockHeader = await BTFetch('/user/GetBlockHeader','GET')

        if(!(blockHeader && blockHeader.code==1)){
            message.error(window.localeInfo["Header.FailedRegister"]);
            return
        }

        let data = blockHeader.data
        let cursor_label = data.cursor_label
        let cursor_num = data.head_block_num
        let lifetime = data.head_block_time

        // did
        let didParam = this.getDid(username,keys)
        let arrSize = msgpack.PackArraySize(2)
        let arrid = msgpack.PackStr16(didParam.Didid)
        let arrStr = msgpack.PackStr16(JSON.stringify(didParam.Didinfo))
        let len = arrSize.byteLength + arrid.byteLength + arrStr.byteLength
        let buf = new Uint8Array(len)
        buf = [...arrSize,...arrid,...arrStr]

        let newuser = {
            version:1,
            cursor_num:cursor_num,
            cursor_label:cursor_label,
            lifetime:lifetime,
            sender:"bottos",
            contract:"usermng",
            method:"reguser",
            param: buf,
            sig_alg:1
        }

        let signObj = this.getSign(keys,newuser)
        newuser.param = BTCryptTool.buf2hex(buf)
        newuser.signature = signObj.toString('hex')

        let registParams = {
            account:{
                Name:username,
                Pubkey:keys.publicKey.toString('hex')
            },
            user:newuser,
            verify_id:this.state.verify_id,
            verify_value:verificationCode
        }

        let registUrl = '/user/register'
        BTFetch(registUrl,'POST',registParams)
        .then(response=>{
            if(response){
                if(response.code == 1){
                    message.success(window.localeInfo["Header.YourRegistrationHasBeenSuccessfullyCompleted"]);
                    let keystoreObj = BTIpcRenderer.createKeystore({account:username,password,privateKey})
                    // 创建本地用户目录
                    BTIpcRenderer.mkdir(username)
                    // 存储keystore文件到本地
                    let isSaveSuccess = BTIpcRenderer.saveKeyStore({username:username,account_name:username},keystoreObj)
                    isSaveSuccess ? message.success('keystore saved success') : message.error('keystore saved faild')
                    this.clearFields()
                }else if(response.code == 1001){
                    message.warning('verify code is wrong');
                }else{
                    message.error(window.localeInfo["Header.FailedRegister"]);
                }
            }else{
                message.error(window.localeInfo["Header.FailedRegister"]);
            }
        }).catch(error=>{
            message.error(window.localeInfo["Header.FailedRegister"]);
        })
    }

    getDid(accountName,keys){
        let publicKey = keys.publicKey
        let privateKey = keys.privateKey
        let publicKeyStr = publicKey.toString('hex')
        let didid = "did:bot:"+publicKeyStr.slice(0,32)
        let didParam = {
            "Didid": didid, // account公钥截取前32位
            "Didinfo": {
                "@context": "https://bottos.org/did/v1",
                "nameBase58": accountName,  // 当前用户名
                "version": "0.1",
                "botid": didid,  // didid
                "account": [{
                    "nameBase58": accountName,
                    "role": "owner",
                    "expires": new Date().getTime()+30*24*60*60,
                    "publicKey": publicKeyStr
                }],
                "control": [{
                    "type": "OrControl",
                    "controller": [{
                        "botid": didid,
                        "type": "EcdsaVerificationKey2018",
                        "owner": didid,  // 当前用户自己
                        "publicKey": publicKeyStr
                    }]
                }],
                "service": {

                },
                "created": new Date().getTime(),
                "updated": new Date().getTime()
            }
        }

        let hash = BTCryptTool.sha256(JSON.stringify(didParam))

        let signature = BTCryptTool.sign(hash,privateKey)
        didParam.Didinfo.signature = {
            "type": "EcdsaVerificationKey2018",
            "created": new Date().getTime(),
            "creator": didid,  // 谁签名写谁的
            "signatureValue": signature.toString('hex')
        }
        return didParam
    }

    getSign(keys,msg){
        let signObj = Object.assign({},msg)
        let priKey = keys.privateKey
        const message_pb = require('../lib/proto/message_pb')
        let encodeBuf = messageProtoEncode(message_pb,msg)
        let hash = BTCryptTool.sha256(BTCryptTool.buf2hex(encodeBuf))
        let sign = BTCryptTool.sign(hash,priKey)
        return sign
    }

    createKeystore(username,password,privateKey){
        let params = {account:username,password,privateKey}

        Keystore.create(params)
    }

    handleRadioChange = (e) => {
        this.clearFields()
        this.setState({
            user_type: e.target.value,
        })
    }

    // TODO: 等后端部署了验证码功能，就可以用了
    requestVerificationCode = () => {

      BTFetch('/user/getVerify', 'get').then(res => {
        if(res && res.code==1){
            this.setState({
                verify_data:res.data.verify_data,
                verify_id:res.data.verify_id
            })
        }
      })

    }

    componentDidMount() {
      this.requestVerificationCode()
    }

    render() {
      if (this.state.isRegistered) {
        const {cryptStr, username} = this.state
        return <BTRegistSuccess cryptStr={cryptStr} username={username} />
      }

        const { getFieldDecorator, getFieldsError, getFieldError, isFieldTouched } = this.props.form;

      return (

        <div className="register">
            <div className='route-children-container-title'><FormattedMessage {...HeaderMessages.Register}/></div>
            <Form style={{maxWidth: 560, paddingRight: '10%'}}>

              <FormItem {...formItemLayout} colon={false} label={<FormattedMessage {...LoginMessages.Account} />}>
                  {
                      getFieldDecorator('username',{})(
                          <Input placeholder={window.localeInfo["Header.PleaseEnterTheUserName"]} id="error1" />
                      )
                  }
              </FormItem>
              <FormItem {...formItemLayout} colon={false} label={<FormattedMessage {...LoginMessages.Password} />}>
                  {
                      getFieldDecorator('password',{})(
                          <Input placeholder={window.localeInfo["Header.PleaseEnterThePassword"]} type="password" id="error2" />
                      )
                  }
              </FormItem>
              <FormItem {...formItemLayout} colon={false} label={<FormattedMessage {...LoginMessages.ConfirmPassword} />}>
                  {
                      getFieldDecorator('newpassword',{})(
                          <Input placeholder={window.localeInfo["Header.PleaseEnterTheSurePassword"]} type="password" id="error1"/>
                      )
                  }
              </FormItem>

                {/* 这部分是验证码功能，先暂时隐藏起来 */}
                <FormItem {...formItemLayout} label={<FormattedMessage {...LoginMessages.VerifyCode} />}>
                  <Row gutter={8}>
                    <Col span={16}>
                      {
                        getFieldDecorator('verificationCode', {}) (
                          <Input placeholder={window.localeInfo["Header.PleaseEnterTheVerificationCode"]} id="error1"/>
                        )
                      }
                    </Col>
                    <Col span={8}>
                      {this.state.verify_data
                        ?
                        <img height='28px'
                          style={{marginBottom: 6, cursor: 'pointer'}}
                          onClick={this.requestVerificationCode}
                          src={this.state.verify_data} />
                        :
                        <Icon type='spin' />
                      }
                    </Col>
                  </Row>
                </FormItem>

            </Form>

            <div style={{textAlign: 'center'}}>
              <ConfirmButton onClick={this.onHandleSubmit} htmlType="submit">
                <FormattedMessage {...HeaderMessages.Register} />
              </ConfirmButton>
            </div>
        </div>
      )
    }
}

const RegistForm = Form.create()(Regist);


export default RegistForm
