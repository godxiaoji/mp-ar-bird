// pages/body-pix/index.js
const fetchWechat = require('fetch-wechat')
const tf = require('@tensorflow/tfjs-core')
const plugin = requirePlugin('tfjsPlugin')

import { Classifier } from '../../models/posenet/classifier.js'
import { image } from '@tensorflow/tfjs-core'
import {
  reset as gameReset,
  images as gameImages,
  setOverCallback as setGameOverCallback,
  draw as gameDraw
} from '../../models/posenet/bird'

const CANVAS_ID = 'canvas'

Page({
  classifier: null,

  ctx: null,

  /**
   * Page initial data
   */
  data: {
    predicting: false,
    videoWidth: null,
    videoHeight: null,

    playCount: 0,
    deny: false
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad (options) {
    plugin.configPlugin({
      fetchFunc: fetchWechat.fetchFunc(),
      tf,
      canvas: wx.createOffscreenCanvas(),
      backendName: 'wechat-webgl-' + Math.random()
    })
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady () {
    this.getSetting().then(() => {
      this.init().then(() => {
        // this.startGame()

        // this.classifier.drawSinglePose(this.ctx, {
        //   score: 0.9,
        //   keypoints: [{ part: 'nose', position: { y: 200, x: 100 } }]
        // })

        // gameDraw(this.ctx)


        this.showReady()
      })
    }).catch(() => {
      this.setData({
        deny: true
      })
    })

    const context = wx.createCameraContext(this)
    this.listener = context.onCameraFrame(frame => {
      this.executeClassify(frame)

      gameDraw(this.ctx)
    })
  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload: function () {
    if (this.classifier && this.classifier.isReady()) {
      this.classifier.dispose()
    }
  },

  /**
   * 获取设置
   */
  getSetting () {
    return new Promise((resolve, reject) => {
      wx.getSetting({
        success (res) {
          if (res.authSetting['scope.camera']) {
            resolve()
          } else {
            reject({
              errMsg: 'camera:fail auth deny'
            })
          }
        },
        fail (err) {
          reject(err)
        }
      })
    })
  },

  /**
   * 打开设置
   */
  openSetting () {
    return new Promise((resolve, reject) => {
      wx.openSetting({
        success (res) {
          if (res.authSetting['scope.camera']) {
            resolve()
          } else {
            reject({
              errMsg: 'camera:fail auth deny'
            })
          }
        },
        fail (err) {
          reject(err)
        }
      })
    })
  },

  onAuthBtnClick () {
    this.openSetting().then(() => {
      this.setData({
        deny: false
      })

      wx.redirectTo({
        url: 'index?reload=1'
      })

      // this.showReady()
    })
  },

  /**
   * 加载图片
   * @param {String} resourceUri
   */
  loadImage (resourceUri) {
    return new Promise((resolve, reject) => {
      wx.getImageInfo({
        src: resourceUri,
        success: res => {
          resolve(res)
        },
        fail: err => {
          reject(err)
        }
      })
    })
  },

  /**
   * 展示等待开始界面
   */
  showReady () {
    wx.showModal({
      title: '欢迎来到AR小怒鸟',
      content: '这是一个脸部捕捉小场景，请保持迷人的脸在屏幕内哦~',
      showCancel: false,
      confirmText: '开始体验',
      success: res => {
        if (res.confirm) {
          this.startGame()
        }
      }
    })
  },

  /**
   * 开始游戏
   */
  startGame () {
    gameReset()

    this.listener.start()
    console.log('Start Game')

    this.setData({
      playCount: this.data.playCount + 1
    })
  },

  /**
   * 游戏结束
   */
  gameOver (score) {
    this.listener.stop()

    wx.showModal({
      title: `得分：${score}`,
      content: `小窍门：\n1.尽量保持手机稳定\n2.通过抬头低头控制小鸟躲避障碍物`,
      showCancel: false,
      confirmText: '继续体验',
      success: res => {
        if (res.confirm) {
          this.startGame()
        }
      }
    })
  },

  init () {
    this.showLoadingToast()

    const queue = []

    queue.push(
      new Promise(resolve => {
        setTimeout(() => {
          this.ctx = wx.createCanvasContext(CANVAS_ID)
          resolve()
        }, 500)
      })
    )

    gameImages.forEach(v => {
      queue.push(this.loadImage(v))
    })

    const systemInfo = wx.getSystemInfoSync()

    this.classifier = new Classifier('front', {
      width: systemInfo.windowWidth,
      height: systemInfo.windowHeight
    })
    queue.push(this.classifier.load())

    return Promise.all(queue)
      .then(() => {
        this.hideLoadingToast()
        setGameOverCallback(score => {
          this.gameOver(score)
        })
      })
      .catch(err => {
        wx.showToast({
          title: err.errMsg,
          icon: 'none'
        })
      })
  },

  initClassifier () {
    const systemInfo = wx.getSystemInfoSync()

    this.classifier = new Classifier('front', {
      width: systemInfo.windowWidth,
      height: systemInfo.windowHeight
    })

    this.classifier
      .load()
      .then(() => {
        this.hideLoadingToast()
      })
      .catch(err => {
        console.log(err)
        wx.showToast({
          title: '网络连接异常',
          icon: 'none'
        })
      })
  },

  executeClassify (frame) {
    if (this.classifier && this.classifier.isReady() && !this.data.predicting) {
      this.setData(
        {
          predicting: true
        },
        () => {
          this.classifier
            .detectSinglePose(frame)
            .then(pose => {
              const nosePosition = pose.keypoints[0].position

              this.classifier.drawSinglePose(this.ctx, pose)

              this.setData({
                predicting: false,
                nosePosition:
                  Math.round(nosePosition.x) + ', ' + Math.round(nosePosition.y)
              })
            })
            .catch(err => {
              console.log(err, err.stack)
            })
        }
      )
    }
  },

  showLoadingToast () {
    wx.showLoading({
      title: '拼命加载中'
    })
  },

  hideLoadingToast () {
    wx.hideLoading()
  },

  /**
   * Lifecycle function--Called when page unload
   */
  onUnload: function () {
    if (this.classifier && this.classifier.isReady()) {
      this.classifier.dispose()
    }
  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function () {
    return {
      title: 'AR小怒鸟-脸部捕捉小场景'
    }
  }
})
