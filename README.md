# youngMVVM
仿Vue2.x实现简单的双向数据绑定

### 实现过程：
1. 实现一个数据监听器Observer：
    - 监听data上的各个属性的变化，为他们绑定getter和setter
    - 一旦数据发生变动，则经由Dep调用notify函数通知Watcher

2. 实现一个订阅者Watcher：
    - 通过Dep接收数据变动的通知，实例化的时候将自己添加到dep中
    - 属性变更时，接收dep的notify，调用自身update方法，触发Compile中绑定的更新函数，进而更新视图

3. 实现一个指令解析器Compile：
    - 用来解析template中的指令，将指令模板中的变量替换成数据，对视图进行初始化操作
    - 订阅数据的变化，绑定好更新函数
    - 接收到数据变化，通知视图进行view update

4. 实现一个MVVM —— Yue：
    - Observer实现对MVVM自身model数据劫持，监听数据的属性变更，并在变动时进行notify
    - Compile实现指令解析，初始化视图，并订阅数据变化，绑定好更新函数
    - Watcher一方面接收Observer通过dep传递过来的数据变化，一方面通知Compile进行view update


