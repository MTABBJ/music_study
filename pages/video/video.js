import request from '../../utils/request'

Page({

  /**
   * 页面的初始数据
   */
  data: {
    videoGroupList: [], //导航标签数据
    navId: '', //导航标识
    videoList: [], //视频列表数据
    videoId: '', //视频id标识
    videoUpdateTime: [], //记录video播放的时长
    isTriggered: false, //标识下拉刷新是否被触发
    countArr:[], //分页参数记录点
    videoListIndex:0, //videoList的排序id
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    //获取导航数据
    this.getVideoGroupListData();

  },
  //获取导航数据函数
  async getVideoGroupListData() {
    let videoGroupListData = await request('/video/group/list');
    this.setData({
      videoGroupList: videoGroupListData.data.slice(0, 14),
      navId: videoGroupListData.data[0].id
    })

    //获取视频列表数据
    this.getVideoList(this.data.navId);
  },

  //获取视频列表数据
  async getVideoList(navId) {
    if (!navId) { //判断navId为空串的情况
      return;
    }
    let videoListData = await request('/video/group', {
      id: navId
    });
    //关闭消息提示框
    wx.hideLoading();

    // console.log(videoListData);
    // let index = 0;
    let videoListIndex = this.data.videoListIndex;
    let videoList = videoListData.datas.map(item => {
      item.id = videoListIndex++;
      return item;
    })
    /*     let videoList = await request('/mv/url', {
          id: navId
        }); */
    this.setData({
      videoList,
      isTriggered: false, //关闭下拉刷新
      videoListIndex
    })
  },
  //点击切换导航的回调
  changeNav(event) {
    /*     let navId = event.currentTarget.id; //通过id向event传参 如果是number会转换成stirng
        console.log(typeof navId);//显示navId是string类型
        this.setData({
          navId:navId*1
          navId:navId>>>0 //等同上行 右移0位会将非number数据强制转换成number
        }) */

    let navId = event.currentTarget.dataset.id;
    this.setData({
      navId: navId,
      videoList: []
    })
    //显示正在加载
    wx.showLoading({
      title: "正在加载"
    })
    //动态获取当前导航对应的视频数据
    this.getVideoList(this.data.navId);
  },

  //点击播放/继续播放的回调
  handlePlay(event) {
    /**
     * 需求：
     * 1. 在点击播放的事件中需要找到上一个播放的视频
     * 2. 在播放新的视频之前关闭上一个正在播放的视频
     * 
     * 关键：(多个视频同时播放问题)
     * 1. 如何找到上一个视频的实例对象
     * 2. 如何确认点击播放的视频和正在播放的视频不是同一个视频
     * 
     * 单例模式：
     * 1. 需要创建多个对象的场景下，通过一个变量接收，始终保持只有一个对象
     * 2. 节省内存空间
     */

    let vid = event.currentTarget.id;
    //关闭上一个播放的视频
    /*     this.vid !== this.videoContext && this.videoContext.stop();
        if (this.vid !== vid) {
          if (this.videoContext) {
            this.videoContext.stop()
          }
        }
        this.vid = vid; */

    //更新data中的videoId的状态数据
    this.setData({
      videoId: vid
    })

    //创建控制video标签的实例对象
    this.videoContext = wx.createVideoContext(vid);
    // 判断当前的视频之前是否播放，是否有播放记录 如果有，跳转至指定的播放位置
    let {
      videoUpdateTime
    } = this.data;
    let videoItem = videoUpdateTime.find(item => item.vid === vid);
    if (videoItem) {
      this.videoContext.seek(videoItem.currentTime);
    }
    this.videoContext.play();
  },
  // 监听视频播放进度的回调
  handleTimeUpdate(event) {
    let videoTimeObj = {
      vid: event.currentTarget.id,
      currentTime: event.detail.currentTarget
    }
    let {
      videoUpdateTime
    } = this.data;
    /**
     * 思路：判断记录播放时长的videoUpdateTime数组中是否有当前视频的播放记录
     * 1. 如果有，在原有的播放记录中修改播放时间为当前的播放时间
     * 2. 如果没有，需要在数组中添加当前视频的播放对象
     */

    let videoItem = videoUpdateTime.find(item => item.vid === videoTimeObj.vid);
    if (videoItem) {
      videoItem.currentTime = event.detail.currentTarget;
    } else {
      videoUpdateTime.push(videoTimeObj);
    }
    ///更新videoUpdateTime状态
    this.setData({
      videoUpdateTime
    })
  },

  // 视频播放结束调用的回调
  handleEnded(event) {
    //移除记录播放时长数组中当前视频的对象
    let {
      videoUpdateTime
    } = this.data;
    videoUpdateTime.splice(videoUpdateTime.findIndex(item => item.vid === event.currentTarget.id), 1);
    this.setData({
      videoUpdateTime
    })
  },
  //自定义下拉刷新的回调： scroll-view
  handleRefresher() {
    // console.log('下拉刷新');
    //再次发请求，获取最新的列表数据
    this.getVideoList(this.data.vid);
  },

  //自定义上拉触底的回调 scroll-view
  async handleToLower() {
    // console.log('上拉加载');
    let arr = this.data.countArr;
    arr.push('抛出的记录点');

    let count = 0;//点击次数 加载的页数
    for (let i = 0; i < arr.length; i++) {
      count++;
    }
    let navId = this.data.navId;
    let getVideoMoreListData = await request('/video/group', {
      id: navId,
      offset: count
    });

    let videoMoreList = getVideoMoreListData.datas.map(item =>{
      item.id = videoListIndex++;
      return item;
    })
    let videoList = this.data.videoList;
    videoList.push(...videoMoreList);
    let videoListIndex = this.data.videoListIndex;
    this.setData({
      videoList,
      videoListIndex
    })


  },

  // 跳转至搜索界面
  toSearch(){
    wx.navigateTo({
      url: '/pages/search/search',
    })
  },
  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {

  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {
    console.log("页面下拉动作");
  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {
    // console.log("页面上拉触底");

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage({from}) {
    // console.log(from);
    if (from === 'button') {
      return {
        title:'来自button的转发',
        path:'/pages/video/video',
        imageUrl:'/static/images/nvsheng.jpg'
      }
    } else {
      return {
        title:'来自menu的转发',
        path:'/pages/video/video',
        imageUrl:'/static/images/nvsheng.jpg'
      }
    }

  }
})