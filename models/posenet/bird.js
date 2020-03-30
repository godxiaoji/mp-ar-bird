const { windowWidth } = wx.getSystemInfoSync()

const gameWidth = windowWidth
const gameHeight = windowWidth * 1.333333

const Main = {
  score: 0,
  collided: false,
  // 检测碰撞
  collide () {
    let min = 0
    let max = gameHeight
    const halfSize = Bird.size / 2

    for (let i = 0; i < Obstacle.list.length; i++) {
      const item = Obstacle.list[i]

      // 检测下是否在可能碰撞区间内
      if (
        item.left <= Bird.left + halfSize &&
        item.left >= Bird.left - halfSize - Obstacle.oWidth
      ) {
        min = item.top
        max = item.bottom
        break
      } else if (
        item.left < Bird.left - halfSize + Obstacle.oWidth &&
        !item.pass
      ) {
        // 通过这个管道
        item.pass = true
        this.score++
      }
    }

    if (
      !this.collided &&
      (Bird.top < min - Bird.tolerance + halfSize ||
        Bird.top > max - halfSize + Bird.tolerance)
    ) {
      // this.die()
      this.collided = true

      return true
      // Player.play('hit');
    }
    return false
  },
  draw (ctx) {
    ctx.setFillStyle('#ffffff')
    ctx.fillRect(gameWidth / 2 - 30, 20, 60, 30)

    ctx.setFontSize(20)
    ctx.setFillStyle('#333333')
    ctx.setTextAlign('center')
    ctx.setTextBaseline('middle')
    ctx.fillText(this.score.toString(), gameWidth / 2, 35)
  },
  init () {
    this.collided = false
    this.score = 0
    this.frameNum = 0
  }
}

export const drawKeypoints = Main.draw

/**
 * 主角
 */
const Bird = {
  // 模型大小
  size: 34,
  left: 83,
  initTop: gameHeight / 2,
  top: gameHeight / 2,
  tolerance: 7,

  sx: 0,
  sy: 0,

  oneWayMoveY: 0,

  updateTop (y) {
    if (this.oneWayMoveY >= 0 && y - this.top >= 0) {
      this.oneWayMoveY += y - this.top
    } else if (this.oneWayMoveY < 0 && y - this.top < 0) {
      this.oneWayMoveY += y - this.top
    } else {
      this.oneWayMoveY = y - this.top
    }

    this.top = y
  },
  step () {
    const size = this.size

    // 处理翅膀切换
    const temp = Main.frameNum % 9
    this.sy = (temp < 3 ? 0 : temp < 6 ? 1 : 2) * size

    // 处理下坠和上飞
    if (this.oneWayMoveY <= -20) {
      this.sx = size
    } else if (this.oneWayMoveY >= 60) {
      this.sx = 3 * size
    } else if (this.oneWayMoveY >= 20) {
      this.sx = 2 * size
    } else {
      this.sx = 0
    }
  },
  draw (ctx) {
    const size = this.size
    const halfSize = size / 2

    ctx.drawImage(
      '/images/bird/birds.png',
      this.sx,
      this.sy,
      size,
      size,
      this.left - halfSize,
      this.top - halfSize,
      size,
      size
    )
  },
  init () {
    this.top = this.initTop
  }
}

/**
 * 障碍物
 */
const Obstacle = {
  spacing: 130,
  shortHeight: 52,
  oWidth: 52,
  width: 152,
  initLeft: gameWidth,
  range: {},
  // 碰撞容错
  tolerance: 5,
  // 障碍物最短
  randRange: {},
  listMax: 20,
  list: [],
  rand () {
    return (
      parseInt(Math.random() * (this.randRange.max - this.randRange.min)) +
      this.randRange.min
    )
  },
  addItem (left) {
    const rand = this.rand()

    this.list.push({
      top: rand,
      bottom: rand + this.spacing,
      left
    })
  },
  init () {
    this.randRange.min = this.shortHeight
    this.randRange.max =
      gameHeight - this.spacing - this.shortHeight * 2
    this.list = []

    let left = this.initLeft
    for (let i = 0; i < this.listMax; i++) {
      this.addItem(left)
      left += this.width
    }
  },
  step () {
    const moveX = -5
    let removeCount = 0

    this.list.forEach(v => {
      v.left += moveX

      if (v.left + this.oWidth <= 0) {
        removeCount++
      }
    })

    if (removeCount > 0) {
      // 删除已移除外面的
      this.list.splice(0, removeCount)
      let left = this.list[this.list.length - 1].left
      // 增加等量的数
      for (let i = 0; i < removeCount; i++) {
        left += this.width
        this.addItem(left)
      }
    }
  },
  draw (ctx) {
    this.list.forEach(item => {
      this.drawPiping(item, true, ctx)
      this.drawPiping(item, false, ctx)
    })
  },
  drawPiping (item, isTop, ctx) {
    ctx.drawImage(
      '/images/bird/piping.png',
      isTop ? 112 : 168,
      0,
      56,
      500,
      item.left,
      isTop ? item.top - 500 : item.bottom,
      56,
      500
    )
  }
}

/**
 * 重置游戏
 */
export function reset () {
  Main.init()
  Bird.init()
  Obstacle.init()
}

let overCallback = null
/**
 * 设置游戏结束回调
 * @param {Function} callback
 */
export function setOverCallback (callback) {
  overCallback = callback
}

export function updateKeypoints (keypoints, minConfidence) {
  let y = null

  for (let i = 0; i < keypoints.length; i++) {
    const keypoint = keypoints[i]

    if (keypoint.score < minConfidence) {
      continue
    }

    if (keypoint.part !== 'nose') {
      // 根据鼻子来
      continue
    }

    y = keypoint.position.y
  }

  if (y != null) {
    Bird.updateTop(y)
  }
}

export function draw (ctx) {
  Obstacle.step()
  Obstacle.draw(ctx)
  Bird.step()
  Bird.draw(ctx)
  Main.draw(ctx)

  ctx.draw()

  Main.collide()

  if (Main.collided) {
    if (typeof overCallback === 'function') {
      overCallback(Main.score)
    }
  }

  Main.frameNum++
}

export const images = ['/images/bird/piping.png', '/images/bird/birds.png']
