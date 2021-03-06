import React,{PureComponent} from 'react'
import { connect } from 'react-redux'
import {getAccount} from "../tools/localStore";
// import BTUploadAsset from './BTUploadAsset'
// import messages from '../locales/messages'
import {Icon, Modal, Radio, Select, message, Button, Input, DatePicker, TimePicker, Cascader, Col, Row } from 'antd';
import BTAssetList from './BTAssetList'
import BTCryptTool from 'bottos-js-crypto'
import {getBlockInfo,getDataInfo} from '../utils/BTCommonApi'
import BTFetch from "../utils/BTFetch";
import {options} from '../utils/option'
import {FormattedMessage} from 'react-intl'
import messages from '../locales/messages'
import moment from "moment"
import uuid from 'node-uuid'
import ConfirmButton from './ConfirmButton'
import BTTypeSelect from './BTTypeSelect'
import * as BTSign from '../lib/sign/BTSign'
import {registAssetPack} from '../lib/msgpack/BTPackManager'

const PersonalAssetMessages = messages.PersonalAsset;
const HeaderMessages = messages.Header;

const { TextArea } = Input;

String.prototype.trim=function() {
    return this.replace(/(^\s*)/g,'');
};
String.prototype.trims=function() {
    return this.replace(/(\s*$)/g,'');
};
class BTPublishAssetModal extends PureComponent{
    constructor(props){
        super(props)

        this.state = {
            value:1,
            title:'',
            number:'',
            description:'',
            tag1:'',
            tag2:'',
            tag3:'',
            dataAssetType:'',
            getFileNameTemp:'',
            getFileName:'',
            getExampleUrl:'',
            getRealUrl:'',
            sample_hash:'',
            storage_hash:'',
            newdata:[],
            date11: '',
            timeValue: '',
        }

        this.onTimeChange = this.onTimeChange.bind(this)
    }

    onChangeDataAssetType = (value) => {
      console.log('value', value);
      this.setState({ dataAssetType: value });
    }

    commitAsset(type) {
      message.destroy()

      this.assetListModal.setState({
          visible:true,
          type:type,
      });

      let param={
          userName: this.props.account_info.username,
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

    onTimeChange(time, timeValue) {
      this.setState({ timeValue });
    }

    title(e){
        this.setState({
            title:e.target.value.trim(),
        })
    }

    handleNumberChange = (e) => {
      var number = e.target.value
        if (isNaN(number)) {
            return;
        }
        if (number >= 1e7) {
          number = 1e7 - 1
        }

        this.setState({number})

    }

    description(e){
        this.setState({
            description:e.target.value.trim()
        })
    }

    tag1(e){
        this.setState({ tag1:e.target.value })
    }

    tag2(e){
        this.setState({ tag2:e.target.value })
    }

    tag3(e){
        this.setState({ tag3:e.target.value })
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

    async updata(){
      let blockInfo = await getBlockInfo()
      let account_info = this.props.account_info
      let privateKeyStr = account_info.privateKey
      let privateKey = Buffer.from(privateKeyStr,'hex')

      let message = {
        "version": 1,
        ...blockInfo,
        "sender": "assetmng",
        "contract": "assetmng",
        "method": "datafilereg",
        "sig_alg": 1
      }

      let did = {
        "asset_id": "filehashtest2",
        "basic_info": {
          "username": "btd121",
          "assetType": "sessidtestwc2",
          "assetName": "assetnametest",
          "featureTag": "feature_tag1",
          "samplePath":"samplsdsfePath",
          "sampleHash": "samplehasttest",
          "storagePath":"storagePath",
          "storageHash": "sthashtest",
          "expireTime": 345,
          "price": 1,
          "description": "description",
          "uploadDate":1323,
          "signature":"signature"
        }
      }
      let arrBuf = registAssetPack(did)
      let params = Object.assign({},message)
      params.param = arrBuf

      let sign = BTSign.messageSign(params,privateKey)
      params.signature = sign.toString('hex')
      params.param = BTCryptTool.buf2hex(arrBuf)
     
      let url = '/asset/registerAsset'

      console.log({params})

      BTFetch(url,'POST',params)
      .then(response=>{
        console.log({response})
      }).catch(error=>{
        console.log('error')
      })
    }

    async updata1(){
        message.destroy();
        for(const key in this.state){
            if(this.state[key]==''){
                message.warning(window.localeInfo["PersonalAsset.PleaseImproveTheInformation"])
                return;
            }
        }
        if(this.state.number<=0||this.state.number>=10000000000){
            message.warning(window.localeInfo["PersonalAsset.InputPrice"]);
            return;
        }
        let reg=/^\d+(?:\.\d{1,10})?$/
        if(!reg.test(this.state.number)){
            message.warning('输入正确的价格');
            return;
        }
        console.log(this.state)
        if (this.state.date11 == '') {
          message.warning('请输入截止时间');
          return;
        }
        let expire_time_string = this.state.date11 + ' ' + (this.state.timeValue ? this.state.timeValue : '')
        let expire_time = new Date(expire_time_string).getTime() / 1000
        let _blockInfo = (await getBlockInfo());
        if(_blockInfo.code!=0){
            message.error(window.localeInfo["PersonalAsset.FailedToGetTheBlockMessages"])
            return;
        }
        let blockInfo=_blockInfo.data;
        let data={
            "code": "assetmng",
            "action": "assetreg",
            "args": {
                "asset_id": uuid.v1(),
                "basic_info": {
                    "user_name": this.props.account_info.username||'',
                    "session_id": getAccount().token||'',
                    "asset_name": this.state.title.trims(),
                    "asset_type": this.state.dataAssetType,
                    "feature_tag1": this.state.tag1,
                    "feature_tag2": this.state.tag2,
                    "feature_tag3": this.state.tag3,
                    "sample_path": this.state.getExampleUrl,
                    "sample_hash": this.state.sample_hash,
                    "storage_path": this.state.getRealUrl,
                    "storage_hash": this.state.storage_hash,
                    "expire_time": expire_time,
                    "price": this.state.number*Math.pow(10,10),
                    "description": this.state.description.trims(),
                    "upload_date": 1,
                    "signature": "0xxxx"
                }
            }
        };
        console.log(data);
        let getDataBin = (await getDataInfo(data));
        if(getDataBin.code!=0){
            message.error(window.localeInfo["PersonalAsset.FailedToGetTheGetDataBin"])
            return
        }
        console.log(
            getDataBin
        );
        let block={
            "ref_block_num":blockInfo.ref_block_num,
            "ref_block_prefix":blockInfo.ref_block_prefix,
            "expiration":blockInfo.expiration,
            "scope":["assetmng"],
            "read_scope":[],
            "messages":[{
                "code":"assetmng",
                "type":"assetreg",
                "authorization":[],
                "data":getDataBin.data.bin
            }],
            "signatures":[]
        };
        console.log(block)
        BTFetch('/asset/register','POST',block,{
            service:'service'
        }).then(repsonse=>{
            if(repsonse.code==1){
                message.success(window.localeInfo["PersonalAsset.SuccessfulToRegisterTheAsset"])
                this.setState({
                    date11:'',
                    value:1,
                    title:'',
                    number:'',
                    description:'',
                    tag1:'',
                    tag2:'',
                    tag3:'',
                    dataAssetType:'',
                    getFileNameTemp:'',
                    getFileName:'',
                    getExampleUrl:'',
                    getRealUrl:'',
                    sample_hash:'',
                    storage_hash:'',

                })
            }else{
                message.error(window.localeInfo["PersonalAsset.FailedToRegisterTheAsset"])
            }
            this.setState({
                data:repsonse.data
            })
        }).catch(error=>{
            message.error(window.localeInfo["PersonalAsset.FailedToRegisterTheAsset"])
            console.log(error);
        })

    }

    dataPicker = (date, dateString) => {
      // console.log('date, dateString', date, dateString);
      this.setState({ date11: dateString })
    }

    render() {
      return (
        <div className='route-children-container route-children-bg'>
          <BTAssetList  ref={(ref)=>this.assetListModal = ref} newdata={this.state.newdata} handleFile={(fileName)=>this.getFileName(fileName)}/>
          <div className="uploadAsset">
            <h2 className='route-children-container-title'>
              <FormattedMessage {...HeaderMessages.PublishAsset}/>
            </h2>

            {/* 上传样例 */}
            <Row gutter={16}>
              <Col className='label' span={6}>
                <FormattedMessage {...PersonalAssetMessages.UploadTheSample}/>
              </Col>
              <Col span={18}>
                <Button type='primary' examplefile={this.state.exampledata} onClick={()=>this.commitAsset('assetTemp')}>
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

            {/* 选择资产文件 */}
            <Row gutter={16}>
              <Col className='label' span={6}>
                <FormattedMessage {...PersonalAssetMessages.UploadTheAsset}/>
              </Col>
              <Col span={18}>
                <Button type='primary' exampledata={this.state.exampledata} onClick={()=>this.commitAsset('asset')}>
                  <FormattedMessage {...PersonalAssetMessages.SetScreeningFile}/>
                </Button>
                <span className='filename'>{
                  this.state.getFileName.length<=14
                  ?
                  this.state.getFileName
                  :
                  this.state.getFileName.split('.')[0].substring(0,5)+'...'+this.state.getFileName.split('.')[1]
                }</span>
              </Col>
            </Row>


            <Row gutter={16}>
              <Col className='label' span={6}>
                <FormattedMessage {...PersonalAssetMessages.AssetName}/>
              </Col>
              <Col span={8}>
                <Input placeholder={window.localeInfo["PersonalAsset.Name"]} value={this.state.title} onChange={(e)=>this.title(e)} />
              </Col>
            </Row>

            <Row gutter={16}>
              <Col className='label' span={6}>
                <FormattedMessage {...PersonalAssetMessages.ExpectedPrice}/>
              </Col>
              <Col span={8}>
                <Input placeholder={window.localeInfo["PersonalAsset.Price"]}
                       type='number'
                       value={this.state.number}
                       onChange={this.handleNumberChange}
                />
              </Col>
              <Col span={4}>
                <img src="./img/token.png" style={{width:20,height:20,margin:5}} alt=""/>
              </Col>
            </Row>



            <Row gutter={16}>
              <Col className='label' span={6}>
                <FormattedMessage {...PersonalAssetMessages.Deadline}/>
              </Col>
              <Col span={12}>
                <DatePicker
                    placeholder={window.localeInfo["PersonalAsset.SelectDate"]}
                    onChange={this.dataPicker}
                    disabledDate={(current) => current < moment().endOf('day')}
                    value={moment(this.state.date11, 'HH:mm:ss')}
                />
                {this.state.date11 &&
                <TimePicker value={moment(this.state.timeValue, 'HH:mm:ss')} onChange={this.onTimeChange} />}
              </Col>
            </Row>


            <Row gutter={16}>
              <Col className='label' span={6}>
                <FormattedMessage {...PersonalAssetMessages.AssetType}/>
              </Col>
              <Col span={12}>
                <BTTypeSelect onChange={this.onChangeDataAssetType} />
                {/* <Cascader value={this.state.cascader}
                  options={options}
                  placeholder={window.localeInfo["PersonalAsset.PleaseSelect"]}
                /> */}
              </Col>
            </Row>

            <Row className="featureTag" gutter={16}>
              <Col className='label' span={6}>
                <FormattedMessage {...PersonalAssetMessages.AssetFeatureTag}/>
              </Col>
              <Col span={12}>
                <Row type="flex" justify="space-between">
                  <Col span={6}><Input type="text" value={this.state.tag1} onChange={(e)=>this.tag1(e)}/></Col>
                  <Col span={6}><Input type="text" value={this.state.tag2} onChange={(e)=>this.tag2(e)}/></Col>
                  <Col span={6}><Input type="text" value={this.state.tag3} onChange={(e)=>this.tag3(e)}/></Col>
                </Row>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col className='label' span={6}>
                <FormattedMessage {...PersonalAssetMessages.AssetDescription}/>
              </Col>
              <Col span={12}>
                <TextArea maxLength='120' value={this.state.description} onChange={(e)=>this.description(e)} rows={4} />
              </Col>
            </Row>

            <div className="uploadNeedSubmit marginTop">
              <ConfirmButton type="submit" onClick={(e)=>this.updata(e)}>
                <FormattedMessage {...PersonalAssetMessages.Publish}/>
              </ConfirmButton>
            </div>
          </div>
        </div>
      )
    }
}


function mapStateToProps(state) {
  const account_info = state.headerState.account_info
  return { account_info }
}

export default connect(mapStateToProps)(BTPublishAssetModal)
