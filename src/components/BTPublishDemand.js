import React, {PureComponent} from 'react'
import { connect } from 'react-redux'
import moment from "moment"
import { Input, DatePicker, message, Button, Row, Col } from 'antd'
import BTAssetList from './BTAssetList'
import {getBlockInfo, getDataInfo} from "../utils/BTCommonApi";
import BTFetch from "../utils/BTFetch";
import {FormattedMessage} from 'react-intl'
import messages from '../locales/messages'
import {getAccount} from '../tools/localStore'
import uuid from 'node-uuid'
import ConfirmButton from './ConfirmButton'
import BTTypeSelect from './BTTypeSelect'
import { toFixedWithoutZero } from '@/utils/number'
import {registDemandPack} from '../lib/msgpack/BTPackManager'
import {messageSign} from '../lib/sign/BTSign'
import BTCrypto from 'bottos-js-crypto'

const PersonalDemandMessages = messages.PersonalDemand;
const PersonalAssetMessages = messages.PersonalAsset;

const { TextArea } = Input;

String.prototype.trim=function() {
    return this.replace(/(^\s*)/g,'');
};
String.prototype.trims=function() {
    return this.replace(/(\s*$)/g,'');
};

const initialState = {
    title:"",
    textArea:"",
    number: '',
    date:"",
    dateString:"",
    ddatePicker:'',
    date11: null,
    newdata: [],
    getFileNameTemp:'',

}

class BTPublishDemand extends PureComponent{
    constructor(props) {
        super(props)
        this.state = initialState
    }

    commitAsset(type){

      message.destroy()

      this.assetListModal.setState({
          visible:true,
          type:type,
      });

      let param={
          userName:getAccount().username,
          random:Math.ceil(Math.random()*100),
          signature:'0xxxx'
      };

      BTFetch('/asset/queryUploadedData','post',param).then(res=>{
        if (res.code == 0) {
          if (res.data.rowCount == 0) {
            message.warning(window.localeInfo["Header.ThereIsNoFileResourceSetForTheTimeBeing"]);
            return;
          }
          // return res.data.row;
          this.setState({
            newdata:res.data.row
          })
        } else {
          message.warning(window.localeInfo["Header.FailedToGetTheFileResourceSet"]);
          return;
        }
      }).catch(error=>{
        message.warning(window.localeInfo["Header.FailedToGetTheFileResourceSet"]);
      })

    }

    getFileName(fileInfo){
        if(fileInfo.type=='asset'){
            this.setState({
                getFileName:fileInfo.value,
                storage_hash:fileInfo.hash,
                getRealUrl:fileInfo.getRealUrl,
            })
        }else if(fileInfo.type=='assetTemp'){
            this.setState({
                getFileNameTemp:fileInfo.value,
                sample_hash:fileInfo.hash,
                getExampleUrl:fileInfo.getExampleUrl,
            })
        }
    }

    onChangeTitle(e){

        this.setState({
            title:e.target.value.trim()
        })
    }
    handleNumberChange = (e) => {
        message.destroy();
        var number = e.target.value
        if (isNaN(number)) {
          return;
        }
        if (number >= 1e7) {
          number = 1e7 - 1
        }
        number = toFixedWithoutZero(number, 6)
        console.log('number', number);

        this.setState({number})
    };

    //datePicker
    onChangeDate(date,dateString) {
        this.setState({
            date:date,
            dateString:dateString,
            date11:date,
        });
    }

    onOpenChangeDate(data){
        console.log(data)
    }
    onChangeTextArea(e){
        this.setState({
            textArea:e.target.value.trim()
        })
    }

    async updata(){
      let blockInfo = await getBlockInfo()
      let account_info = this.props.account_info
      let privateKeyStr = account_info.privateKey
      let privateKey = Buffer.from(privateKeyStr,'hex')

      let params = {
        "version": 1,
        ...blockInfo,
        "sender": account_info.username,
        "contract": "datareqmng",
        "method": "datareqreg",
        "sig_alg": 1
      }

      let did = {
        "dataReqId": "1",
        "basic_info": {
          "username": account_info.username,
          "reqName": this.state.title || '',
          "reqType": 1,
          "featureTag": "1",
          "sampleHash": "1",
          "expireTime": 1455379533,
          "opType": 2,
          "price": 1000,
          "favoriFlag": 1,
          "description": "1"
        }
      }

      let packBuf = registDemandPack(did)
      params.param = packBuf
      let sign = messageSign(params,privateKey)
      params.signature = sign.toString('hex')
      params.param = BTCrypto.buf2hex(packBuf)

      console.log({params})

      let url = '/requirement/Publish'
      BTFetch(url,'POST',params)
      .then(response=>{
        console.log({response})
      }).catch(error=>{
        console.log({error})
      })
    }



    //点击后数据收集、fetch
    async updata1(){
        message.destroy();
        if(!this.state.title || !this.state.date || !this.state.textArea){
            message.warning(window.localeInfo["PersonalDemand.PleaseImproveTheDemand"])
            return;
        }
        if(this.state.number<=0||this.state.number>=10000000000){
            message.warning(window.localeInfo["PersonalDemand.PleaseInputPrice"])
            return;
        }
        let reg=/^\d+(?:\.\d{1,10})?$/
        if(!reg.test(this.state.number)){
            message.warning('输入正确的价格');
            return;
        }
        //链的data
        let blockData = {
            code: "datareqmng",
            action: "datareqreg",
            args: {
                data_req_id: uuid.v1(),
                basic_info: {
                    user_name: getAccount().username,
                    session_id: getAccount().token,
                    requirement_name: this.state.title.trims(),
                    feature_tag: 111,
                    sample_path: "pathtest",
                    sample_hash: "hashtest",
                    expire_time: (new Date(this.state.dateString).getTime())/1000,//截止时间时间戳
                    price: this.state.number*Math.pow(10,10),
                    description: this.state.textArea.trims(),
                    publish_date: '1',//当前时间戳
                    signature: "sigtest"
                }
            }
        }
        console.log(blockData)
        let blockInfo = await getBlockInfo();
        let blockDataBin = await getDataInfo(blockData);
        if(blockInfo.code!=0 || blockDataBin.code!=0){
            message.error(window.localeInfo["PersonalDemand.FailedToGetTheBlockMessages"])
            return ;
        }
        let param={
            ref_block_num: blockInfo.data.ref_block_num,
            ref_block_prefix: blockInfo.data.ref_block_prefix,
            expiration: blockInfo.data.expiration,
            scope: ["datareqmng"],
            read_scope: [],
            messages: [{
                code: "datareqmng",
                type: "datareqreg",
                authorization: [],
                data: blockDataBin.data.bin
            }],
            signatures: []
        };


        BTFetch("/requirement/Publish",'post',param)
            .then(res=>{
                if(res.code==0) {
                    this.setState({
                        title:"",
                        textArea:"",
                        number:'',
                        date:"",
                        date11:'',
                        dateString:'',
                        DatePicker:'',
                    });
                    message.success(window.localeInfo["PersonalDemand.SuccessfulToPublishTheDemand"])
                }else{
                    message.error(window.localeInfo["PersonalDemand.FailedToPublishTheDemand"])
                }
            }).catch(error=>{
            console.log(2)
            message.error(window.localeInfo["PersonalDemand.FailedToPublishTheDemand"])
        })
    }

    render() {
        return (
          <div className="upLoadNeed route-children-bg">
            <h2 className='route-children-container-title'>
              <FormattedMessage {...PersonalDemandMessages.PublishTheDemand} />
            </h2>

            <Row gutter={16}>
              <Col className='label' span={6}>
                <FormattedMessage {...PersonalDemandMessages.DemandName} />
              </Col>
              <Col span={8}>
                <Input value={this.state.title} onChange={(e)=>this.onChangeTitle(e)}  />
              </Col>
            </Row>


            <Row gutter={16}>
              <Col className='label' span={6}>
                <FormattedMessage {...PersonalDemandMessages.RecruitmentPrice}/>
              </Col>
              <Col span={8}>
                <Input
                  type='number'
                  defaultValue={0}
                  value={this.state.number}
                  onChange={this.handleNumberChange}
                />
              </Col>
              <Col span={4}>
                <img src="./img/token.png" style={{width:20,height:20,margin:5}} alt=""/>
              </Col>
            </Row>

            {/* 上传样例 */}
            <Row gutter={16}>
              <Col className='label' span={6}>
                <FormattedMessage {...PersonalAssetMessages.UploadTheSample}/>
              </Col>
              <Col span={18}>
                <Button type='primary'
                  examplefile={this.state.exampledata}
                  onClick={()=>this.commitAsset('assetTemp')}
                >
                  <FormattedMessage {...PersonalAssetMessages.SetScreeningSample}/>
                </Button>
                <span className='filename'>{
                    this.state.getFileNameTemp.length<=14
                    ?
                    this.state.getFileNameTemp
                    :
                    this.state.getFileNameTemp.split('.')[0].substring(0,5)+'...'+this.state.getFileNameTemp.split('.')[1]
                }</span>
              </Col>
            </Row>

            <BTAssetList ref={(ref) => this.assetListModal = ref}
              newdata={this.state.newdata}
              handleFile={(fileName)=>this.getFileName(fileName)}
            />

            <Row gutter={16}>
              <Col className='label' span={6}>
                <FormattedMessage {...PersonalAssetMessages.AssetType} />
              </Col>
              <Col span={12}>
                <BTTypeSelect />
              </Col>
            </Row>

            <Row gutter={16}>
              <Col className='label' span={6}>
                <FormattedMessage {...PersonalDemandMessages.Deadline}/>
              </Col>
              <Col span={8}>
                <DatePicker
                  placeholder={window.localeInfo["PersonalDemand.SelectDate"]}
                  onChange={(date,dateString)=>this.onChangeDate(date,dateString)}
                  onOpenChange={(date)=>this.onOpenChangeDate(date)}
                  disabledDate={(current) => current < moment().endOf('day')}
                  value={this.state.date11}
                  // showTime={{ defaultValue: moment('00:00:00', 'HH:mm:ss') }}
                />
              </Col>
            </Row>

            <Row gutter={16}>
              <Col className='label' span={6}>
                <FormattedMessage {...PersonalDemandMessages.DemandDescription}/>
              </Col>
              <Col span={12}>
                <TextArea maxLength='120' rows={4} value={this.state.textArea} onChange={(e)=>this.onChangeTextArea(e)} />
              </Col>
            </Row>

            <div className="uploadNeedSubmit marginTop">
              <ConfirmButton type="submit" onClick={(e)=>this.updata(e)}>
                <FormattedMessage {...PersonalDemandMessages.Publish}/>
              </ConfirmButton>
            </div>
          </div>
        )
    }
}


function mapStateToProps(state) {
  const account_info = state.headerState.account_info
  return { account_info }
}

export default connect(mapStateToProps)(BTPublishDemand)