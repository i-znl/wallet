import React, {Component} from 'react'

// import BTAssetCell from './subviews/AssetCell'
import {Pagination,message,List} from 'antd'
import Assetlist from './subviews/Assetlist'
import BTMyTag from '../../components/BTMyTag'
import BTFetch from '../../utils/BTFetch'
import CustomTabBar from '@/components/CustomTabBar'

const keyMap = ['All', 'Text', 'Picture', 'Voice', 'Video']

export default class BTAssets extends Component {
    constructor(props) {
        super(props);
        this.state = {
            dataSource: [],
            rowCount: 0,
            pageNum: '',
            activeKey: '0',
        };

        this.onChange = this.onChange.bind(this)
    }

    componentDidMount() {
        this.getPagination(1, 16)
    }

    onChange(page,pageSize) {
        // this.setState({dataSource:[]});
        this.getPagination(page,pageSize)
    }

    getPagination(page,pageSize) {
        let reqUrl = '/asset/query';
        let param = {
            "pageSize": pageSize,
            "pageNum": page,
        };
        BTFetch(reqUrl,'POST',param).then(response=>{
            if (response && response.code == 0) {
              const {rowCount, row} = response.data
                if (rowCount == 0 || !Array.isArray(row)) {
                    return ;
                }
                this.setState({
                    dataSource: row,
                    rowCount,
                });
            } else {
                message.error(window.localeInfo["Asset.FailedToQueryTheMarketSource"])
            }
        }).catch(error => {
            console.log(error)
            message.error(window.localeInfo["Asset.FailedToQueryTheMarketSource"])

        });
    }

    handleChange = (activeKey) => {
      // console.log('activeKey', activeKey);
      this.setState({ activeKey });
    }

    render() {

      if ( React.isValidElement(this.props.children) ) {
        return this.props.children
      }
      return (
        <div className='container column'>
          <CustomTabBar onChange={this.handleChange} keyMap={keyMap} activeKey={this.state.activeKey} />
          <List
            grid={{ gutter: 16, column: 4 }}
            dataSource={this.state.dataSource}
            renderItem={item => (
              <List.Item>
                <Assetlist key={item.asset_id} list={item} />
              </List.Item>
            )}
          />

          <Pagination
            hideOnSinglePage
            showQuickJumper
            total={this.state.rowCount}
            defaultCurrent={1}
            pageSize={16}
            onChange={this.onChange}
          />

        </div>
      )
    }
}
