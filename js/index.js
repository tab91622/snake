var sw = 20,	//一个方块的宽度
	sh = 20,	//一个方块的高度
	tr = 30,	//行数
	td = 30;	//列数

var snake = null,	//蛇的实例
	food = null,	//食物的实例
	game = null;	//游戏的实例

const SIMPLE 	= 2 	// 简单
const ORDINARY 	= 1 	// 普通
const HARD 		= 0.5 	// 困难
const LIMIT		= 0.25   // 速度上限
const Variety 	= 0.8   // 变化系数
const globalData = {
	gameTimeTimer: null, // 游戏时间的计时器
	accessLockTimer: null, // 允许穿越障碍/自身的计时器
	accessLockTime: 5, // 无视障碍的持续时间
	__accessLock: false, // 允许穿越障碍/自身
	__difficultyLevel: SIMPLE, // 该值乘以定时器时间间隔，以改变运动速度
	increaseSpeedGap: 5, // 每 5 秒加一次速
	randomWallsNum: 5, // 随机墙壁的数量
	randomWallsGap: 10, // 每 10 秒增加随机墙壁，随机墙壁持续
	randomWallsExistTime: 5, // 随机墙壁持续时间
	manyFoodsTimer: null, // 大量食物的计时器
	manyFoodsTime: 6, // 大量食物的持续时间
}

Object.defineProperty(globalData, 'accessLock', {
	get () {
		return globalData.__accessLock
	},
	set(val) {
		globalData.__accessLock = val
		if (val) {
			// 5秒内允许穿越障碍/自身
			console.log(`》》》》》》允许穿越障碍/自身《《《《《《`)
			globalData.accessLockTimer = setTimeout(_ => {
				globalData.__accessLock = false
				globalData.accessLockTimer = null
				console.log(`》》》》》》停止穿越障碍/自身《《《《《《`)
			}, globalData.accessLockTime * 000)
		}	
	}
})

Object.defineProperty(globalData, 'difficultyLevel', {
	get () {
		return globalData.__difficultyLevel
	},
	set(val) {
		globalData.__difficultyLevel = val
		// 重新设置定时器
		game.increaseSpeed()
	}
})

/**
 * 收集的是 Square 实例对象
 */
class WallCollection {
	constructor (parentDom) {
		this.parentDom = parentDom
		this.__list = []
		this.pos = [] // 存储墙的坐标
	}

	get length () {
		return this.__list.length
	}

	walls () {
		return this.__list
	}

	/**
	 * 添加的是 Square 实例对象
	 * @param {Square} item 
	 */
	add (item) {
		this.parentDom.appendChild(item.viewContent)
		this.__list.push(item)
		this.pos.push([item.x / sw, item.y / sh])
	}

	remove (item) {
		this.parent.removeChild(item.viewContent)
		const targetIdx = this.__list.indexOf(item)
		if (targetIdx > -1) {
			this.__list.splice(targetIdx, 1)
			this.pos.splice(targetIdx, 1)
		}
	}

	removeAll () {
		while(this.__list.length) {
			const item = this.__list.pop()
			this.parentDom.removeChild(item.viewContent)
		}
		this.pos = []
	}
}

/**
 * 增加难度 -- 随游戏时间逐渐增加
 */
function increaseDifficultyLevel () {
	if (globalData.difficultyLevel > LIMIT) {
		globalData.difficultyLevel *= Variety
		const speed = parseInt(1000 / (200 * globalData.difficultyLevel))
		console.log(`》》》》》》速度：${speed}格/秒《《《《《《`)
	}
	else globalData.difficultyLevel = LIMIT
}

/**
 * 记录游戏时间
 * @param {HTMLElement} timeDom 填充时间的 dom
 * @param {number} startTime 游戏开始时间，时间戳
 * @returns {function}
 */
function generateRecordGameTime (timeDom, startTime) {
	let lastTime = null
	const { increaseSpeedGap, randomWallsGap, randomWallsExistTime } = globalData
	function goTime() {
		// 获取当前时间戳与起始时间戳的差值
		const disTim = Date.now() - startTime
		// 转换为页面展示的字符串
		const second = parseInt(disTim / 1000)
		const disStr = formatDisTime(second)
		// 惰性赋值
		if (disStr !== lastTime) {
			if (second > 0 && second % increaseSpeedGap === 0) {
				// 每 n 秒加一次速
				increaseDifficultyLevel()
			}
			if (second > 0 && second % randomWallsGap === 0) {
				// 每 n 秒增加随机墙壁，随机墙壁持续 n 秒
				game.addRandomWalls()
				setTimeout(_ => game.clearRandomWalls(), randomWallsExistTime * 1000)
			}
			timeDom.innerHTML = disStr
			lastTime = disStr
		}
		globalData.gameTimeTimer = setTimeout(_ => goTime(), 1000 - disTim % 1000)
	}
	return goTime
}

function formatDisTime (time) {
	const minute = parseInt(time / 60)
	const second = time % 60
	return `0${minute}`.slice(-2) + ' : ' + `0${second}`.slice(-2)
}

var timeContent = document.querySelector('.time-panel-content')
var scoreContent = document.querySelector('.score-panel-content')

function updateScore (score) {
	scoreContent.innerHTML = score
	globalData.accessLock = game.score % 10 === 0	// 每 10 分可允许穿越障碍/自身

}

//方块构造函数
function Square(x, y, classname) {
	//0,0		0,0
	//20,0		1,0
	//40,0		2,0

	this.x = x * sw;
	this.y = y * sh;
	this.class = classname;

	this.viewContent = document.createElement('div');	//方块对应的DOM元素
	this.viewContent.className = this.class;
	this.parent = document.getElementById('snakeWrap');//方块的父级
}
Square.prototype.create = function () {	//创建方块DOM，并添加到页面里
	this.viewContent.style.position = 'absolute';
	this.viewContent.style.width = sw + 'px';
	this.viewContent.style.height = sh + 'px';
	this.viewContent.style.left = this.x + 'px';
	this.viewContent.style.top = this.y + 'px';

	this.parent.appendChild(this.viewContent);
};
Square.prototype.remove = function () {
	this.parent.removeChild(this.viewContent);
};

//蛇
function Snake() {
	this.head = null;	//存一下蛇头的信息
	this.tail = null;	//存一下蛇尾的信息
	this.pos = [];	//存储蛇身上的每一个方块的位置

	this.directionNum = {	//存储蛇走的方向，用一个对象来表示
		left: {
			x: -1,
			y: 0,
			rotate: 180	//蛇头在不同的方向中应该进行旋转，要不始终是向右
		},
		right: {
			x: 1,
			y: 0,
			rotate: 0
		},
		up: {
			x: 0,
			y: -1,
			rotate: -90
		},
		down: {
			x: 0,
			y: 1,
			rotate: 90
		}
	}
}
Snake.prototype.init = function () {
	//创建蛇头
	var snakeHead = new Square(2, 0, 'snakeHead');
	snakeHead.create();
	this.head = snakeHead;	//存储蛇头信息
	this.pos.push([2, 0]);	//把蛇头的位置存起来

	//创建蛇身体1
	var snakeBody1 = new Square(1, 0, 'snakeBody');
	snakeBody1.create();
	this.pos.push([1, 0]);	//把蛇身1的坐标也存起来

	//创建蛇身体2
	var snakeBody2 = new Square(0, 0, 'snakeBody');
	snakeBody2.create();
	this.tail = snakeBody2;	//把蛇尾的信息存起来
	this.pos.push([0, 0]);	//把蛇身1的坐标也存起来


	//形成链表关系
	snakeHead.last = null;
	snakeHead.next = snakeBody1;

	snakeBody1.last = snakeHead;
	snakeBody1.next = snakeBody2;

	snakeBody2.last = snakeBody1;
	snakeBody2.next = null;

	//给蛇添加一条属性，用来表示蛇走的方向
	this.direction = this.directionNum.right;	//默认让蛇往右走
};

//这个方法用来获取蛇头的下一个位置对应的元素，要根据元素做不同的事情
Snake.prototype.getNextPos = function () {
	var nextPos = [	//蛇头要走的下一个点的坐标
		this.head.x / sw + this.direction.x,
		this.head.y / sh + this.direction.y
	]

	if (!globalData.accessLock) {
		// 当允许穿越时，不检测对自身/随机墙的碰撞
		this.pos.forEach(function (value) {
			if (value[0] == nextPos[0] && value[1] == nextPos[1]) {
				//如果数组中的两个数据都相等，就说明下一个点在蛇身上里面能找到，代表撞到自己了
				return this.strategies.die.call(this)
			}
		});

		if (game.wallSet.length > 0) {
			// 检查随机墙
			const walls = game.wallSet.pos
			for (let i = 0, j = walls.length; i < j; i++) {
				const wall = walls[i]
				if (wall[0] == nextPos[0] && wall[1] == nextPos[1]) {
					console.log('》》》》》》撞到随机墙壁《《《《《《')
					//如果数组中的两个数据都相等，就说明下一个点在随机墙壁上
					return this.strategies.die.call(this)
				}
			}
		}
	}

	//下个点是边缘围墙，游戏结束
	if (nextPos[0] < 0 || nextPos[1] < 0 || nextPos[0] > td - 1 || nextPos[1] > tr - 1) {
		console.log('撞墙了！');

		this.strategies.die.call(this);

		return;
	}

	//下个点是食物，吃
	if (food && food.pos[0] == nextPos[0] && food.pos[1] == nextPos[1]) {
		//如果这个条件成立说明现在蛇头要走的下一个点是食物的那个点
		console.log('撞到食物了！');
		this.strategies.eat.call(this);
		return;
	}

	//下个点什么都不是，走
	this.strategies.move.call(this);
};

//处理碰撞后要做的事
Snake.prototype.strategies = {
	move: function (format) {	//这个参数用于决定要不要删除最后一个方块（蛇尾）。当传了这个参数后就表示要做的事情是吃
		//创建新身体（在旧蛇头的位置）
		var newBody = new Square(this.head.x / sw, this.head.y / sh, 'snakeBody');
		//更新链表的关系
		newBody.next = this.head.next;
		newBody.next.last = newBody;
		newBody.last = null;

		this.head.remove();	//把旧蛇头从原来的位置删除
		newBody.create();

		//创建一个新蛇头(蛇头下一个要走到的点nextPos)
		var newHead = new Square(this.head.x / sw + this.direction.x, this.head.y / sh + this.direction.y, 'snakeHead');
		//更新链表的关系
		newHead.next = newBody;
		newHead.last = null;
		newBody.last = newHead;
		newHead.viewContent.style.transform = 'rotate(' + this.direction.rotate + 'deg)';
		newHead.create();

		//蛇身上的每一个方块的坐标也要更新
		this.pos.splice(0, 0, [this.head.x / sw + this.direction.x, this.head.y / sh + this.direction.y]);
		this.head = newHead;	//还要把this.head的信息更新一下


		if (!format) {	//如果fromat的值为false，表示需要删除（除了吃之外的操作）
			this.tail.remove();
			this.tail = this.tail.last;

			this.pos.pop();
		}
	},
	eat: function () {
		this.strategies.move.call(this, true);
		createFood();
		game.score++;
		updateScore(game.score)
	},
	die: function () {
		//console.log('die');
		game.over();
	}
}
snake = new Snake();

function randomX () {
	return Math.round(Math.random() * (td - 1));
}

function randomY () {
	return Math.round(Math.random() * (tr - 1));
}

/**
 * 检测某个点与点集合的碰撞
 * @param {[x: number, y: number]} point 
 * @param {[[x: number, y: number]]} set 
 */
function checkCollision (point, set) {
	const [x0, y0] = point
	return set.some(([x1, y1]) => x0 === x1 && y0 === y1)
}

//创建食物
function createFood() {
	//食物小方块的随机坐标
	var x = null;
	var y = null;

	var include = true;	//循环跳出的条件，true表示食物的坐标在蛇身上（需要继续循环）。false表示食物的坐标不在蛇身上（不循环了）
	while (include) {
		x = randomX()
		y = randomY()
		//这个条件成立说明现在随机出来的这个坐标，在蛇身上并没有找到。
		include = checkCollision([x, y], snake.pos)
	}

	//生成食物
	food = new Square(x, y, 'food');
	food.pos = [x, y];	//存储一下生成食物的坐标，用于跟蛇头要走的下一个点做对比

	var foodDom = document.querySelector('.food');
	if (foodDom) {
		foodDom.style.left = x * sw + 'px';
		foodDom.style.top = y * sh + 'px';
	} else {
		food.create();
	}
}

function setGameInterval (refreshGameTime = false) {
	refreshGameTime && generateRecordGameTime(timeContent, this.startTime)()
	clearInterval(this.timer)
	this.timer = setInterval(function () {
		snake.getNextPos();
	}, 200 * globalData.difficultyLevel);
}

//创建游戏逻辑
function Game() {
	this.timer = null;
	this.score = 0;
	this.wallSet = new WallCollection(document.getElementById('snakeWrap'))
}
Game.prototype.init = function () {
	snake.init();
	createFood();

	document.onkeydown = function (ev) {
		if (ev.which == 37 && snake.direction != snake.directionNum.right) {	//用户按下左键的时候，这条蛇不能是正下往右走
			snake.direction = snake.directionNum.left;
		} else if (ev.which == 38 && snake.direction != snake.directionNum.down) {
			snake.direction = snake.directionNum.up;
		} else if (ev.which == 39 && snake.direction != snake.directionNum.left) {
			snake.direction = snake.directionNum.right;
		} else if (ev.which == 40 && snake.direction != snake.directionNum.up) {
			snake.direction = snake.directionNum.down;
		}
	}

	this.startTime = Date.now()

	this.start();
	// this.addRandomWalls()
}

/**
 * 
 * @param {boolean} incSpeed 是否仅提高速度
 */
Game.prototype.start = function (incSpeed = false) {	//开始游戏
	globalData.difficultyLevel = SIMPLE
	setGameInterval.call(this, true)
}

Game.prototype.increaseSpeed = function () {
	setGameInterval.call(this)
}

Game.prototype.continue = function () {
	// 调整 startTime，加上暂停的时间，重新计算
	this.startTime += Date.now() - this.pauseTime
	setGameInterval.call(this, true)
}

Game.prototype.pause = function () {
	clearInterval(this.timer);
	clearTimeout(globalData.gameTimeTimer)
	// 获取暂时时的时间戳
	this.pauseTime = Date.now()
}

Game.prototype.addRandomWalls = function () {
	const wallSet = this.wallSet
	const { randomWallsNum } = globalData
	for (let i = 0; i < randomWallsNum; i++) {
		// 先产生随机坐标
		let x = randomX()
		let y = randomY()
		// 将该坐标与蛇身体、食物、已存在的墙的坐标检测碰撞
		while(checkCollision([x, y], [...snake.pos, (food && food.pos) || [], ...wallSet.pos])) {
			x = randomX()
			y = randomY()
		}
		const wall = new Square(x, y, 'wall')
		wallSet.add(wall)
		wall.create()
	}
}

Game.prototype.clearRandomWalls = function () {
	this.wallSet.removeAll()
}

Game.prototype.over = function () {
	clearInterval(this.timer);
	clearTimeout(globalData.gameTimeTimer)
	alert('你的得分为：' + this.score);

	//游戏回到最初始的状态
	var snakeWrap = document.getElementById('snakeWrap');
	snakeWrap.innerHTML = '';

	snake = new Snake();
	game = new Game()

	var startBtnWrap = document.querySelector('.startBtn');
	startBtnWrap.style.display = 'block';
}


//开启游戏
game = new Game();
var startBtn = document.querySelector('.startBtn button');
startBtn.onclick = function () {
	startBtn.parentNode.style.display = 'none';
	game.init();
};

//暂停
var snakeWrap = document.getElementById('snakeWrap');
var pauseBtn = document.querySelector('.pauseBtn button');
snakeWrap.onclick = function () {
	game.pause();

	pauseBtn.parentNode.style.display = 'block';
}

pauseBtn.onclick = function () {
	game.continue();
	pauseBtn.parentNode.style.display = 'none';
}



