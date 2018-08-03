# youngMVVM
仿Vue2.x实现简单的双向数据绑定

### 实现过程：
1. 实现一个数据监听器Observer，用来监听data上的各个属性的变化，为他们绑定getter和setter，一旦数据发生变动，则经由Dep调用notify函数通知Watcher

2. 实现一个订阅者Watcher，用来将自己添加到对应属性的Dep中，并将对应属性的变化通知对应的指令调用update方法更新视图

3. 实现一个指令解析器Compile，用来解析template中的指令，根据初始化render数据得到指令所依赖的数据和update方法，然后给每一个数据绑定的节点生成一个Watcher


