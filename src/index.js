Dep.target = null;
/**
 * @class 双向绑定类 Yue
 * @param {[type]} options [description]
 */
function Yue(options) {
    this.$options = options || {};
    let data = this._data = this.$options.data;
    let self = this;

    Object.keys(data).forEach(key => {
        self._proxyData(key);
    });
    observe(data, this);
    new Compile(options.$el || document.body, this);
}

Yue.prototype = { 
    /**
     * [属性代理]
     * @param  {[type]} key    [数据key]
     * @param  {[type]} setter [属性set]
     * @param  {[type]} getter [属性get]
     */
    _proxyData: function(key, setter, getter) {
        let self = this;
        setter = setter ||
        Object.defineProperty(self, key, {
            configurable: false,
            enumerable: true,

            get: function proxyGetter() {
                return self._data[key];
            },

            set: function proxySetter(newVal) {
                self._data[key] = newVal;
            }
        })
    }
};

function observe(value) {
    if(!value || typeof value !== 'object') {
        return;
    }
    return new Observer(value);
}

/**
 * @class 发布类 Observer that are attached to each observed
 * @param {[type]} value [vm参数]
 */
function Observer(value) {
    this.value = value;
    this.walk(value);
}

Observer.prototype = {
    walk: function(obj) {
        let self = this;

        Object.keys(obj).forEach(function (key) {
            self.defineReactive(obj, key, obj[key]);
        });
    },

    defineReactive: function(obj, key, val) {
        let dep = new Dep();

        Object.defineProperty(obj, key, {
            enumerable: true, // 可枚举
            configurable: true, // 可重新定义
            get: function() { // get数据到依赖的组件
                if(Dep.target) {
                    dep.addSub(Dep.target); // 收集依赖
                }
                return val;
            },
            set: function(newVal) { // set新值
                if(newVal === val || (newVal !== newVal && val !== val)) 
                    return;
                console.log('数据更新啦' + val + '=>' + newVal);
                val = newVal;
                observe(newVal); //
                dep.notify(); // dep通知订阅者Watcher
            }
        });
    }
}

/**
 * @class 依赖类 Dep
 */
function Dep() {
    this.subs = []; // 存储watcher
}

Dep.prototype = {

    addSub: function(sub) { // 添加订阅者watcher
        this.subs.push(sub);
    },

    notify: function() { // 通知数据变更
        this.subs.forEach(sub => { 
            sub.update(); // 执行sub的update更新函数
        });
    }
};

/**
 * @class 指令解析类 Compile
 * @param {[type]} el [element节点]
 * @param {[type]} vm [mvvm实例]
 */

function Compile(el, vm) {
    this.$vm = vm;
    this.$el = this.isElementNode(el) ? el : document.querySelector(el);

    if(this.$el) {
        this.$fragment = this.nodeFragment(this.$el);
        this.compileElement(this.$fragment);
        // 将文档碎片放回真实的dom
        this.$el.appendChild(this.$fragment);
    }
}

Compile.prototype = {
    compileElement: function(el) { // 
        let self = this;
        let childNodes = el.childNodes; // 当前html文档中的节点列表

        [].slice.call(childNodes).forEach(node => { // 遍历当前文档的节点列表
            let text = node.textContent; // 当前节点的内容，包括回车的内容为空
            // console.log(text);
            let reg = /\{\{((?:.|\n)+?)\}\}/;

            if(self.isElementNode(node)) { // 如果是element节点
                self.compile(node);
            } else if(self.isTextNode(node) && reg.test(text)) { // 如果是text节点
                // console.log(RegExp.$1.trim());
                self.compileText(node, RegExp.$1); // 匹配第一个选项
            }

            if(node.childNodes && node.childNodes.length) { // 解析子节点包含的指令
                self.compileElement(node);
            }
        });
    },

    nodeFragment: function(el) { 
        // 文档碎片，遍历过程中会有多次的dom操作
        // 为提高性能我们会将el节点转化为fragment文档碎片进行解析操作
        // 解析操作完成，将其添加回真实dom节点中
        let fragment = document.createDocumentFragment();
        let child;

        while(child = el.firstChild) {
            fragment.appendChild(child);
        }

        return fragment;
    },

    compile: function(node) { // 指令解析
        let nodeAttrs = node.attributes;
        let self = this;

        [].slice.call(nodeAttrs).forEach(attr => {
            var attrName = attr.name; // 指令y-html

            if(self.isDirective(attrName)) {
                var exp = attr.value; // data中的属性
                var dir = attrName.substring(2);
                // console.log(dir);

                if(self.isEventDirective(dir)) { // 事件指令
                    compileUtil.eventHandler(node, self.$vm, exp, dir);
                } else { // 普通指令
                    compileUtil[dir] && compileUtil[dir](node, self.$vm, exp);
                }
            }
        });
    },

    compileText: function(node, exp) { // 匹配变量 
        
        compileUtil.text(node, this.$vm, exp);
    },

    isElementNode: function(node) { // 判断是否为element节点
        return node.nodeType === 1;
    },

    isTextNode: function(node) { // 判断是否为text文本节点
        return node.nodeType === 3;
    },

    isDirective: function(attr) { // y-XXX指令判定
        return attr.indexOf('y-') === 0;
    },

    isEventDirective: function (dir) { // 事件指令判定
        return dir.indexOf('on') === 0;
    }
};

// 定义$elm，缓存当前执行input事件的input dom对象
let $elm;
let timer = null;

const compileUtil = { // 指令处理集合
    html: function(node, vm, exp) {
        this.bind(node, vm, exp, 'html');
    },

    text: function(node, vm, exp) {
        this.bind(node, vm, exp, 'text');
    },

    class: function(node, vm, exp) {
        this.bind(node, vm, exp, 'class');
    },

    model: function(node, vm, exp) {
        this.bind(node, vm, exp, 'model');

        let self = this;
        let val = this._getVmVal(vm, exp);

        // 监听input事件
        node.addEventListener('input', function(e) {
            let newVal = e.target.value;
            $elm = e.target;

            if(val === newVal) {
                return;
            }

            // 设置定时器，完成UI JS的异步渲染
            clearTimeout(timer);
            timer = setTimeout(function() {
                self._setVmVal(vm, exp, newVal);
                val = newVal;
            });
        });
    },

    bind: function(node, vm, exp, dir) {
        let updaterFn = updater[dir + 'Updater'];

        updaterFn && updaterFn(node, this._getVmVal(vm, exp));

        new Watcher(vm, exp, function(value, oldValue) {
            updaterFn && updaterFn(node, value, oldValue);
        });
    },

    eventHandler: function(node, vm, exp, dir) { // 事件处理
        let eventType = dir.split(':')[1];
        let fn = vm.$options.methods && vm.$options.methods[exp];

        if(eventType && fn) {
            node.addEventListener(eventType, fn.bind(vm), false);
        }
    },
    /**
     * [获取挂载在vm实例上的value]
     * @param  {[type]} vm  [mvvm实例]
     * @param  {[type]} exp [expression]
     */
    _getVmVal: function(vm, exp) {
        let val = vm;
        exp = exp.split('.');
        exp.forEach(key => {
            key = key.trim();
            val = val[key];
        });
        return val;
    },

    /**
     * [设置挂载在vm实例上的value]
     * @param  {[type]} vm  [mvvm实例]
     * @param  {[type]} exp [expression]
     * @param  {[type]} value [新值]
     */
    _setVmVal: function(vm, exp, value) {
        let val = vm;
        exps = exp.split('.');
        exps.forEach((key, index) => {
            key = key.trim();
            if (index < exps.length - 1) {
                val = val[key];
            } else {
                val[key] = value;
            }
        });
    }
}

const updater = { // 指令渲染集合   
    htmlUpdater: function(node, value) {
        node.innerHTML = typeof value === 'undefined' ? '' : value; // data中的属性的值
    },

    textUpdater: function(node, value) {
        node.textContent = typeof value === 'undefined' ? '' : value;
    },

    classUpdater: function () {},

    modelUpdater: function (node, value, oldValue) {
        // 不对当前操作input进行渲染操作
        if ($elm === node) {
          return false;
        }
        $elm = undefined;
        node.value = typeof value === 'undefined' ? '' : value;
    }
};

/**
 * @class 观察类
 * @param {[type]}   vm      [vm对象]
 * @param {[type]}   expOrFn [属性表达式]
 * @param {Function} cb      [回调函数(一半用来做view动态更新)]
 */
function Watcher(vm, expOrFn, cb) {
    this.vm = vm;
    expOrFn = expOrFn.trim();
    this.expOrFn = expOrFn;
    this.cb = cb;
    this.depIds = {};

    if (typeof expOrFn === 'function') {
        this.getter = expOrFn
    } else {
        this.getter = this.parseGetter(expOrFn);
    }
    this.value = this.get();
}

Watcher.prototype = {
    update: function () {
        this.run();
    },

    run: function () {
        let newVal = this.get();
        let oldVal = this.value;
        if (newVal === oldVal) {
            return;
        }
        this.value = newVal;
        this.cb.call(this.vm, newVal, oldVal); // 将newVal, oldVal挂载到MVVM实例上
    },

    get: function () {
        Dep.target = this;  // 将当前订阅者指向自己
        let value = this.getter.call(this.vm, this.vm); // 触发getter，将自身添加到dep中
        Dep.target = null;  // 添加完成 重置
        return value;
    },
    
    addDep: function (dep) { // 添加Watcher to Dep.subs[]
        if (!this.depIds.hasOwnProperty(dep.id)) {
            dep.addSub(this);
            this.depIds[dep.id] = dep;
        }
    },

    parseGetter: function (exp) {
        if (/[^\w.$]/.test(exp)) return;
  
        let exps = exp.split('.');
  
        return function(obj) { // 简易的循环依赖处理
            for (let i = 0, len = exps.length; i < len; i++) {
                if (!obj) return;
                obj = obj[exps[i]];
            }
            return obj;
        }
    }
};