function Yue(options) {
    this.data = options.data;
    var data = this.data;

    observe(data, this);

    var id = options.el;
    var dom = nodeToFragment(document.getElementById(id), this); 
    // 编译完成后将dom返回到app中
    document.getElementById(id).appendChild(dom);
    
}

var yue = new Yue({
    el: 'app',
    data: {
        text: 'Hello World!'
    }
});

function observe(obj, vm) {
    Object.keys(obj).forEach(function (key) {
        defineReactive(vm, key, obj[key]);
    });
}

function defineReactive(obj, key, val) {
    var dep = new Dep();

    Object.defineProperty(obj, key, {
        // enumerable: true,
        // configurable: true,
        get: function deineGetter() {
            if(Dep.target) {
                dep.addSub(Dep.target);
            }

            console.log(val);
            return val;
        },
        set: function defineSetter(newVal) {
            if(newVal === val) return;

            val = newVal;
            dep.notify(); // dep通知订阅者Watcher
        }
    });
}

function nodeToFragment(node, vm) {
    var fragment = document.createDocumentFragment();
    var child;

    while (child == node.firstChild) {
        compile(child, vm);
        fragment.appendChild(child);
    }
    return fragment;
}

function compile(node, vm) {
    var reg = /\{\{(.*)\}\}/;

    // 节点类型为元素
    if(node.nodeType === 1) {
        var attr = node.attributes;

        // 解析属性
        for(let i = 0, len = attr.length; i < len; i++) {
            if(attr[i].nodeName === 'v-model') {
                var name = attr[i].nodeValue; // 获取v-model绑定的属性名

                node.addEventListener('input', function(e) {
                    // 给相应的data属性赋值，进而触发该属性的set方法

                    vm[name] = e.target.value;
                });

                node.value = vm[name]; // 将data的值赋给该node
                node.removeAttribute('v-model');
            }
        }

        new Watcher(vm, node, name, 'input');
    }

    // 节点类型为text
    if(node.nodeType === 3) {
        if(reg.test(node.nodeValue)) {
            var name = RegExp.$1; // 获取匹配到的字符串
            name = name.trim(); // 去除空格

            new Watcher(vm, node, name, 'text');
        }
    }
}

function Watcher(vm, node, name, nodeType) {
    console.log(this);
    Dep.target = this; // this为watcher函数

    this.vm = vm;
    this.node = node;
    this.name = name;
    this.nodeType = nodeType; 

    this.update();
    Dep.target = null;
}

Watcher.prototype = {
    get: function() { // 获取data中属性值
        this.value = this.vm[this.name]; // 触发相应属性的get
    },

    update: function() {
        this.get();

        if(this.nodeType == 'text') {
            this.node.nodeValue = this.value;
        }
        if(this.nodeType == 'input') {
            this.node.value = this.value;
        }
    },
};

function Dep() {
    this.subs = [];
}

Dep.prototype = {
    addSub: function(sub) {
        this.subs.push(sub);
    },
    notify: function() {
        this.subs.forEach(sub => {
            sub.update();
        });
    }
};