---
title: K8s学习笔记
date: 2025-10-26
icon: eos-icons:configuration-file
order: 2
---





### 一、Namespace(命名空间)

命名空间其实主要目的就是进行资源的隔离以及资源的配额。我们可以给不同的命名空间设置不同的资源占有



yaml文件

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: dev
```





### 二、Pod
pod是k8s调度的最小单位，<font style="color:#DF2A3F;">容器运行在pod中</font>，一个pod中可以运行多个容器。



下面是一个简单的使用yaml文件启动pod的yaml内容

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: nginx-test
  namespace: dev
spec:
  containers:
  -	image: nginx:1.17.1
    #镜像拉取策略
    imagePullPolicy: IfNotPresent
    # 容器名称
    name: nginx-pod
    ports:
    # 端口的名称
    -	name: nginx-test-port
    # 绑定的端口号
      containerPort: 80
      protocol: TCP
```



#### 1.label(标签)


下面是一个使用yaml类来配置pod资源，并且添加label

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: nginx-dev
  namespace: dev
  labels:
    version: "1.0"
    env: "dev"
spec:
  containers:
  -	image: nginx:1.17.1
    imagePullPolicy: IfNotPresent
    name: pod
    ports:
    -	name: pod-nginx-dev-port
      containerPort: 80
      procotol: TCP
```



+ 使用kubectl命令行的方式打标签

> kubectl label pod nginx-dev -n dev version=1.1
>



+ 查询对应的label的pod

>  kubectl get pods -l "version=1.1" -n dev --show-labels
>

+ 删除version标签

> kubectl label pod nginx-dev -n dev version-
>



#### 2.deployment(Pod控制器)
一般开发中，我们都不是直接创建pod的，而是使用pod控制器deployment来管理pod的，这样做有很大的好处，首先deployment可以帮我们创建指定数量的pod,并且监控这些pod,如果有出现问题的pod，会自动帮我们启动一个新的pod来维持指定数量。



+ 使用kubectl命令行来创建deployment

> kubectl create deployment nginx-deployment -n dev --image=nginx:1.17.1 --replicas=3
>

+ 删除deployment

> kubectl delete deployment nginx-deployment -n dev
>

+ 使用yaml配置文件创建deployment

```yaml
apiVersion: apps/v1
kind: Deployment
# deployment的元数据配置
metadata:
  name: deployment-nginx
  namespace: dev
spec:
# pod的数量
  replicas: 3
  # label选择器，来判断如何选择pod
  selector:
    matchLabels:
      app: nginx-dev
  # template下的其实是pod的创建模板
  template:
     metadata:
       labels:
         app: nginx-dev
     spec:
       containers:
       -	image: nginx:1.17.1
          imagePullPolicy: IfNotPresent
          name: nginx-image
          ports:
          - name: nginx-dev-port
            containerPort: 80
            protocol: TCP
```



#### 3.Service
我们使用deployment来启动pod的时候，pod的ip地址是会变的，所以我们不能直接连接pod的IP地址，所以这个时候就需要使用Service了，它会自动帮我们对pod进行服务发现和负载均衡，相当于网关层，将我们的请求给到pod上，即使pod重启之后IP地址变化了，也不会有影响。



+ 使用kubectl命令行的方式启动一个Service

> kubectl expose deploy deployment的名字 --name=svc-nginx --port=80 --target-port=80 --type=ClusterIP -n dev
>



+ 使用yaml配置文件创建Service

```yaml
apiVersion: v1
kind: Service
metadata:
  name: svc-nginx
  namespace: dev
spec:
  # 如果我们下面的type=ClusterIP,那么集群IP会使用我们这里设置的IP
  # 这个参数的配置是可选的
  clusterIP: 10.100.179.131
  ports:
  - port: 80
    targetPort: 80
    protocol: TCP
  #类型，ClusterIP是集群IP类型，只能k8s集群内部访问，外网无法访问
  type: ClusterIP
  # label选择器，去选择pod的label
  selector:
    app: nginx-dev
  
```



#### 4.Pod配置
我们可以通过命令来查询pod下面的yaml中都可以配置什么属性

> kubectl explain pod
>



下面是一个比较常用的资源配置清单:

```yaml
apiVersion: v1     #必选，版本号，例如v1
kind: Pod       　 #必选，资源类型，例如 Pod
metadata:       　 #必选，元数据
  name: string     #必选，Pod名称
  namespace: string  #Pod所属的命名空间,默认为"default"
  labels:       　　  #自定义标签列表
    - name: string      　          
spec:  #必选，Pod中容器的详细定义
  containers:  #必选，Pod中容器列表
  - name: string   #必选，容器名称
    image: string  #必选，容器的镜像名称
    imagePullPolicy: [ Always|Never|IfNotPresent ]  #获取镜像的策略 
    command: [string]   #容器的启动命令列表，如不指定，使用打包时使用的启动命令
    args: [string]      #容器的启动命令参数列表
    workingDir: string  #容器的工作目录
    volumeMounts:       #挂载到容器内部的存储卷配置
    - name: string      #引用pod定义的共享存储卷的名称，需用volumes[]部分定义的的卷名
      mountPath: string #存储卷在容器内mount的绝对路径，应少于512字符
      readOnly: boolean #是否为只读模式
    ports: #需要暴露的端口库号列表
    - name: string        #端口的名称
      containerPort: int  #容器需要监听的端口号
      hostPort: int       #容器所在主机需要监听的端口号，默认与Container相同
      protocol: string    #端口协议，支持TCP和UDP，默认TCP
    env:   #容器运行前需设置的环境变量列表
    - name: string  #环境变量名称
      value: string #环境变量的值
    resources: #资源限制和请求的设置
      limits:  #资源限制的设置
        cpu: string     #Cpu的限制，单位为core数，将用于docker run --cpu-shares参数
        memory: string  #内存限制，单位可以为Mib/Gib，将用于docker run --memory参数
      requests: #资源请求的设置
        cpu: string    #Cpu请求，容器启动的初始可用数量
        memory: string #内存请求,容器启动的初始可用数量
    lifecycle: #生命周期钩子
		postStart: #容器启动后立即执行此钩子,如果执行失败,会根据重启策略进行重启
		preStop: #容器终止前执行此钩子,无论结果如何,容器都会终止
    livenessProbe:  #对Pod内各容器健康检查的设置，当探测无响应几次后将自动重启该容器
      exec:       　 #对Pod容器内检查方式设置为exec方式
        command: [string]  #exec方式需要制定的命令或脚本
      httpGet:       #对Pod内个容器健康检查方法设置为HttpGet，需要制定Path、port
        path: string
        port: number
        host: string
        scheme: string
        HttpHeaders:
        - name: string
          value: string
      tcpSocket:     #对Pod内个容器健康检查方式设置为tcpSocket方式
         port: number
       initialDelaySeconds: 0       #容器启动完成后首次探测的时间，单位为秒
       timeoutSeconds: 0    　　    #对容器健康检查探测等待响应的超时时间，单位秒，默认1秒
       periodSeconds: 0     　　    #对容器监控检查的定期探测时间设置，单位秒，默认10秒一次
       successThreshold: 0
       failureThreshold: 0
       securityContext:
         privileged: false
  restartPolicy: [Always | Never | OnFailure]  #Pod的重启策略
  nodeName: <string> #设置NodeName表示将该Pod调度到指定到名称的node节点上
  nodeSelector: obeject #设置NodeSelector表示将该Pod调度到包含这个label的node上
  imagePullSecrets: #Pull镜像时使用的secret名称，以key：secretkey格式指定
  - name: string
  hostNetwork: false   #是否使用主机网络模式，默认为false，如果设置为true，表示使用宿主机网络
  volumes:   #在该pod上定义共享存储卷列表
  - name: string    #共享存储卷名称 （volumes类型有很多种）
    emptyDir: {}       #类型为emtyDir的存储卷，与Pod同生命周期的一个临时目录。为空值
    hostPath: string   #类型为hostPath的存储卷，表示挂载Pod所在宿主机的目录
      path: string      　　        #Pod所在宿主机的目录，将被用于同期中mount的目录
    secret:       　　　#类型为secret的存储卷，挂载集群与定义的secret对象到容器内部
      scretname: string  
      items:     
      - key: string
        path: string
    configMap:         #类型为configMap的存储卷，挂载预定义的configMap对象到容器内部
      name: string
      items:
      - key: string
        path: string
```



##### 4.1 镜像拉取策略
1. IfNotPresent

当本地存在这个镜像的时候使用本地的，本地没有这个镜像的时候去远程docker仓库进行拉取。如果我们的**<font style="color:#DF2A3F;">镜像后面指定了tag,默认是使用这个策略的</font>**。  


2. Always

一直从远程docker仓库进行拉取。<font style="color:#DF2A3F;">如果我们的镜像使用的是latest,默认是使用这个策略的</font>。

3.  Never  
只会使用本地的镜像，不会从远程docker仓库拉取  



##### 4.2 启动命令
下面是一个在启动容器的时候，指定启动命令的yaml配置示例

```yaml
apiVersion: v1
kind: Pod
metadata:
    name: pod-test
    namespace: test
spec:
    containers:
    -   image: nginx:1.17.1
        imagePullPolicy: IfNotPresent
        name: nginx-test
        ports:
        - name: nginx-test-port
          containerPort: 80
          protocol: TCP

    -   image: busybox:1.30
        imagePullPolicy: IfNotPresent
        name: busybox-test
        command: ["/bin/sh","-c","touch /tmp/hello.txt;while true; do /bin/echo $(date +%T) >> /tmp/hello.txt; sleep 3; done;"]

```



##### 4.3 容器资源配额
如果我们不给容器设置资源额度的话，那么某一个容器疯狂消耗资源的时候，就会造成整个pod的资源不够。  
下面是一个使用yaml配置文件来指定资源配额的方法

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: pod-nginx
  namespace: dev
  labels:
    app: nginx-dev
spec:
  containers:
  - image: nginx:1.17.1
    imagePullPolicy: IfNotPresent
    name: nginx-container
    ports:
    - name: nginx-dev-port
      containerPort: 80
      protocol: TCP
    # 容器资源配额
    resources:
    #资源上限
      limits:
      #cpu数量最大为2（逻辑核数）
        "cpu": 2
        #内存最大2G
        "memory": "2Gi"
      #资源下限
      requests:
        "cpu": 1
        "memory": "10Mi"
        
```



##### 4.4 初始化容器
在我们启动<font style="color:#ED740C;">应用程序(也就是在spec.contaners中定义的容器)</font>之前，我们可能需要一些前置的条件，必须等这些前置条件执行完成之后，我们的应用容器才能启动，那么我们就可以使用初始化容器。

> 初始化容器是在应用容器启动之前先启动的，并且如果有多个初始化容器，多个初始化容器是<font style="background-color:#FBDE28;">串行</font>执行的。
>



下面是一个使用yaml来配置初始化容器的文件

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: nginx
  namespace: dev
spec:
  containers:
  - image: nginx:1.17.1
    name: nginx-container
    ports:
    - name: nginx-port
      containerPort: 80
      protocol: TCP
  initContainers:
    - name: test-mysql
      image: busybox:1.30
      command: ['sh','-c','until ping 192.168.0.10 -c 1; do echo waiting for mysql ...; sleep 2; done;']
    - name: test-redis
      image: busybox:1.30
      command: ['sh','-c','until ping 192.168.0.11 -c 1; do echo waiting for redis ...; sleep 2; done;']

```



##### 4.5 生命周期钩子函数
k8s中pod中容器创建的过程中，给我们留了两个可以操作的钩子函数，一个是<font style="color:#ED740C;">容器启动之后的钩子函数</font>，另一个是<font style="color:#ED740C;">容器停止前的钩子函数。</font>

下面是使用一个yaml资源来配置钩子函数的例子:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: nginx1
  namespace: dev
spec:
  containers:
  - image: nginx:1.17.1
    name: nginx1
    ports:
    - containerPort: 80
      protocol: TCP
    # 指定生命周期钩子函数
    lifecycle:
      # 启动后钩子
      postStart:
        # 执行命令
        exec:
          command: ['/bin/sh','-c','echo hello,world... > /usr/share/nginx/html/index.html']
      # 停止前钩子函数
      preStop:
        #执行命令 
        exec:
          command: ['/usr/sbin/nginx','-s','quit']
```



##### 4.6 容器探测
容器探测是做什么的呢?  
我们将一批pod暴露出去的时候是通过Service进行暴露的，但是Service在进行<font style="color:#ED740C;">请求分配</font>的时候，是可能将请求分配到坏的pod上的，这个时候就需要进行容器探测，当探测成功的时候才会进行请求的分配。



容器探测分为两种探测，一种是存活性探测(livenessProbe)、另一种是就绪性探测(readinessProbe)

<font style="color:#DF2A3F;">存活性探测如果探测失败，会导致容器进行重启</font>

<font style="color:#DF2A3F;">就绪性探测如果探测失败，会影响对这个容器的请求分配</font>



存活性探测和就绪性探测都有三种方式，一种exec执行命令的方式、一种tcpSocket的方式、一种httpGet的方式

下面是对应的三种yaml资源清单的定义

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: nginx2
  namespace: dev
spec:
  containers:
  - image: nginx:1.17.1
    name: nginx2
    ports:
    - containerPort: 80
      name: ngin2-port
    # 存活性探测
    livenessProbe:
      # 执行命令的方式
      exec:
        command:
        - cat
        - /tmp/hello
```



```yaml
apiVersion: v1
kind: Pod
metadata:
  name: nginx2
  namespace: dev
spec:
  containers:
  - image: nginx:1.17.1
    name: nginx2
    ports:
    - containerPort: 80
      name: ngin2-port
    livenessProbe:
      # tcpSocket的方式
      tcpSocket:
        # 去探测的端口
        port: 80
        # 如果host不填写，默认访问Pod的IP
        #host: "ip地址"
```



```yaml
apiVersion: v1
kind: Pod
metadata:
  name: nginx2
  namespace: dev
spec:
  containers:
  - image: nginx:1.17.1
    name: nginx2
    ports:
    - containerPort: 80
      name: ngin2-port
    livenessProbe:
      # httpGet的方式
      httpGet:
       #使用HTTP协议
        scheme: "HTTP"
        # 发送http get请求的端口
        port: 80
        # 发送http get请求的路径
        path: "/"
        # 如果不填写host的话，默认就是Pod的IP
        #host: "IP地址"
```



##### 4.7 重启策略
pod中可以设置重启策略，并且这个**<font style="color:#DF2A3F;">重启策略是针对Pod中所有的容器的</font>**。Pod中的重启策略有三种：Always、OnFailure、Never

Always: 只要容器失效就会自动重启，这个也是默认的配置

OnFailure:如果容器不是正常终止的，即退出码不为0的时候，进行重启

Never：从不进行重启



下面是一个使用yaml资源清单定义重启策略的案例

```yaml
apiVersion: v1
kind: Pod
metadata:
    name: nginx
    namespace: dev
spec:
    containers:
    -   image: nginx:1.17.1
        imagePullPolicy: IfNotPresent
        name:  nginx
        ports:
        -   containerPort: 80
            name: nginx-port
            protocol: TCP
        livenessProbe:
            httpGet:
                port: 80
                path: "/hello"
                scheme: "HTTP"
    # Pod的所有容器的重启策略
    restartPolicy: Never
```



##### 4.8 Pod生命周期
我们一般将pod对象从创建至终的这段时间范围称为pod的生命周期，它主要包含下面的过程：

+ pod创建过程
+ 运行初始化容器（init container）过程
+ 运行主容器（main container）
    - 容器启动后钩子（post start）、容器终止前钩子（pre stop）
    - 容器的存活性探测（liveness probe）、就绪性探测（readiness probe）
+ pod终止过程  
![](https://s3.bmp.ovh/imgs/2025/10/16/bbafd5fadede3aa3.png)

在整个生命周期中，Pod会出现5种**状态**（**相位**），分别如下：

+ 挂起（Pending）：apiserver已经创建了pod资源对象，但它尚未被调度完成或者仍处于下载镜像的过程中
+ 运行中（Running）：pod已经被调度至某节点，并且所有容器都已经被kubelet创建完成
+ 成功（Succeeded）：pod中的所有容器都已经成功终止并且不会被重启
+ 失败（Failed）：所有容器都已经终止，但至少有一个容器终止失败，即容器返回了非0值的退出状态
+ 未知（Unknown）：apiserver无法正常获取到pod对象的状态信息，通常由网络通信失败所导致

---

创建和终止

**pod的创建过程**

1. 用户通过kubectl或其他api客户端提交需要创建的pod信息给apiServer
2. apiServer开始生成pod对象的信息，并将信息存入etcd，然后返回确认信息至客户端
3. apiServer开始反映etcd中的pod对象的变化，其它组件使用<font style="color:#DF2A3F;">watch机制</font>来跟踪检查apiServer上的变动
4. scheduler发现有新的pod对象要创建，开始为Pod分配主机并将结果信息更新至apiServer
5. node节点上的kubelet发现有pod调度过来，尝试调用docker启动容器，并将结果回送至apiServer
6. apiServer将接收到的pod状态信息存入etcd中

![](https://s3.bmp.ovh/imgs/2025/10/16/5c12efe2cabea5c6.png)

<font style="color:rgb(81, 90, 110);background-color:rgb(245, 247, 249);"></font>

**pod的终止过程**

1. 用户向apiServer发送删除pod对象的命令
2. apiServcer中的pod对象信息会随着时间的推移而更新，在宽限期内（默认30s），pod被视为dead
3. 将pod标记为terminating状态
4. kubelet在监控到pod对象转为terminating状态的同时启动pod关闭过程
5. 端点控制器监控到pod对象的关闭行为时将其从所有匹配到此端点的service资源的端点列表中移除
6. 如果当前pod对象定义了preStop钩子处理器，则在其标记为terminating后即会以同步的方式启动执行
7. pod对象中的容器进程收到停止信号
8. 宽限期结束后，若pod中还存在仍在运行的进程，那么pod对象会收到立即终止的信号
9. kubelet请求apiServer将此pod资源的宽限期设置为0从而完成删除操作，此时pod对于用户已不可见



##### 4.9 Pod调度
Pod调度的意思是：将Pod分配到哪个Node中进行创建。

Pod的调度有下面几大类：

自动调度：由Scheduler决定调度到哪个Node中

定向调度：指定调度到哪个Node中

亲和性调度：

亲和性调度可以实现<font style="color:#ED740C;">优先根据我们的配置选择Node，如果实在没有对应的node,这个pod依然可以被调度到nodoe上运行</font>。反观定向调度，如果没有匹配的Node,那么这个pod永远得不到执行。

亲和性调度分为三类：

    1. nodeAffinity(node亲和性)：以node为目标，解决pod可以调度到哪些node上的 问题
    2. podAffinity(pod亲和性):以Pod为目标，解决pod可以和哪些pod在同一个网络拓扑结构中
    3. podAntiAffinity(pod反亲和性):以pod为目标，解决pod不可以和哪些pod在同一个网络拓扑结构中

污点调度：





1. 定向调度  
下面是一个使用yaml资源清单定义定向调度的案例

```yaml
apiVersion: v1
kind: Pod
metadata:
    name: nginx1
    namespace: dev
spec:
  containers:
  - image: nginx:1.17.1
    imagePullPolicy: IfNotPresent
    name: nginx1
    ports:
    - containerPort: 80
      name: nginx1-port
      protocol: TCP
  # 指定node的名字来进行定向调度
  nodeName: node1
```





2. 亲和性调度  
下面是使用yaml资源清单，定义亲和性调度的案例
    1. node亲和性调度

```yaml
apiVersion: v1
kind: Pod
metadata:
    name: nginx1
    namespace: dev
spec:
  containers:
  - image: nginx:1.17.1
    imagePullPolicy: IfNotPresent
    name: nginx1
    ports:
    - containerPort: 80
      name: nginx1-port
      protocol: TCP
  # 亲和性
  affinity:
    # node亲和性
    nodeAffinity:
      # 软性亲和，即使没有满足条件的，也会找到一个node进行调度
      preferredDuringSchedulingIgnoredDuringExecution:
        # 这个规则的权重，范围在1~100
        - weight: 10
          # label选择器术语
          preference:
          # 匹配表达式
            matchExpressions:
            # label的key
            - key: env
            # 运算符
              operator: "In"
              # label的值
              values: ["test","yyyy"]

```

    2. Pod亲和性调度

```yaml
apiVersion: v1
kind: Pod
metadata:
    name: nginx2
    namespace: dev
spec:
    containers:
    -   image: nginx:1.17.1
        imagePullPolicy: IfNotPresent
        name: nginx2
        ports:
        -   name: nginx2-port
            containerPort: 80
            protocol: TCP
    # 亲和性调度
    affinity:
        # Pod亲和性调度
        podAffinity:
          # 硬调度：必须满足条件才会调度，否则不调度
            requiredDuringSchedulingIgnoredDuringExecution:
            # topologyKey有两种
            # kubernetes.io/hostname通过node的IP地址来找Pod
            # beta.kubernetes.io/os通过node的操作系统来找Pod
            -   topologyKey: kubernetes.io/hostname
                # 通过label标签选择器来找Pod
                labelSelector:
                  # 表达式列表
                    matchExpressions:
                        # label的key
                    -   key: env
                        # 运算符
                        operator: "In"
                        # label的值
                        values: ["test"]
```

---

```yaml
apiVersion: v1
kind: Pod
metadata:
    name: nginx2
    namespace: dev
spec:
    containers:
    -   image: nginx:1.17.1
        imagePullPolicy: IfNotPresent
        name: nginx2
        ports:
        -   name: nginx2-port
            containerPort: 80
            protocol: TCP
    # 亲和性
    affinity:
        # Pod反亲和性调度
        podAntiAffinity:
            # 硬调度
            requiredDuringSchedulingIgnoredDuringExecution:
            # topologyKey有两种
            # kubernetes.io/hostname通过node的IP地址来找Pod
            # beta.kubernetes.io/os通过node的操作系统来找Pod
            -   topologyKey: kubernetes.io/hostname
                # label选择器
                labelSelector:
                    # 匹配表达式
                    matchExpressions:
                        # label的key 
                    -   key: env
                        # 表达式
                        operator: "In"
                        # label的值
                        values: ["dev"]
```



3. 污点调度  
前面说的定向调度和亲和度调度都是基于Pod的角度进行调度的。而接下来说的污点调度则是从Node的角度说的，我们可以给Node节点设置不同级别的污点来控制是否可以让Pod调度到自己这个Node上来。



    1. 给Node设置污点的命令

> kubectl taint node [node的名字] [key]=[value]:[级别]
>





    2. 给Node取消某一个污点的命令

> kubectl taint node [node名字] [key]:[级别]-
>



    3. 给Node取消所有污点的命令

> kubectl taint node [node名字] [key]-
>



Node污点的级别有三个：PreferNoSchedule、NoSchedule、NoExecute

> 1. PreferNoSchedule:Kubernetes<font style="color:#ED740C;">尽量避免</font>将Pod调度到这个Node节点上，但是如果其他节点都无法调度的话，这个Node节点<font style="color:#DF2A3F;">依然可以运行</font>Pod。
>
> 
>
> 2. NoSchedule: kubernetes<font style="color:#DF2A3F;">不会</font>将Pod调度到这个Node节点，但是<font style="color:#DF2A3F;">已经在这个Node节点上运行的Pod依然可以运行</font>。
>
> 
>
> 3. NoExecute:Kubernetes<font style="color:#DF2A3F;">不会</font>将Pod调度到这个Node节点，并且会<font style="color:#DF2A3F;">驱逐</font>已经在这个Node节点上运行的Pod。
>



容忍度：容忍度是在Pod的角度，即Node节点设置了污点，但是我Pod可以通过容忍度忽略Node节点的污点。

下面是一个通过yaml资源清单创建Pod容忍度的案例

```yaml
apiVersion: v1
kind: Pod
metadata:
    name: nginx5
    namespace: dev
spec:
    containers:
    -   image: nginx:1.17.1
        imagePullPolicy: IfNotPresent
        name: nginx5
        ports:
        -   name: nginx5-port
            containerPort: 80
            protocol: TCP
    # 容忍度        
    tolerations:
    # Node节点污点的key
    -   key: name
        # 运算符
        operator: "Equal"
        # Node节点污点的value
        value: "node1"
        # Node节点污点的级别
        effect: NoSchedule
        # 如果污点级别为NoExecute，通过下面这个节点设置这个Pod可以在Node中运行的时间
        # 过了这个时间之后依然会被Node节点驱逐
        #tolerationSeconds: 100
```



### 三、Pod控制器


#### 3.1 ReplicaSet(RS)
ReplicaSet这种Pod控制器，可以设置Pod的副本数量，并且它会自动监听Pod的执行情况，来自动维护一定数量的Pod。并且可以进行 **<font style="color:#DF2A3F;">扩缩容</font>**和**<font style="color:#DF2A3F;">镜像升级</font>**。



下面是一个使用yaml资源清单来定义RS，Pod控制器的案例

```yaml
apiVersion: apps/v1
kind: ReplicaSet
metadata:
    name: rs-nginx
    namespace: dev
    labels:
        env: dev
spec:
    replicas: 3
    selector:
        matchLabels:
            name: nginx-dev
    template:
        metadata:
            labels:
                name: nginx-dev
        spec:
            containers:
            - image: nginx:1.17.1
              name: nginx-dev
              ports:
              - containerPort: 80

```



扩缩容的命令

> kubectl scale rs [ReplicaSet的名字] --replicas=数量 -n [命名空间]
>



更新镜像的命令

> kubectl set image rs [ReplicaSet的名字] [容器名字]=[镜像] -n [命名空间]
>



#### 3.2 Deployment
##### 容器升级策略
Deployment中有两种容器升级策略，ReCreate(重建策略)、rollingUpdate(滚动更新)



+ Recreate策略

Recreate策略会一次性全量更新所有的Pod。

下面是一个使用yaml资源清单来设置Recreate策略的案例

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
    name: deploy1
    namespace: dev
    labels:
        app: deploy1
spec:
    replicas: 3
    selector:
        matchLabels:
            app: nginx
    # 升级策略
    strategy:
        # 类型：重建策略
        type: "Recreate"
    template:
        metadata:
            labels:
                app: nginx
        spec:
            containers:
            - name: nginx1
              image: nginx:1.17.1
              ports:
              - containerPort: 80
                name: nginx-port
```



+ RollingUpdate策略

RollingUpdate策略是滚动更新，也是Deployment创建Pod的<font style="color:#DF2A3F;">默认升级策略</font>。不会一次性将所有的Pod都停掉进行更新，而是会选选择1/4个容器进行定调更新，然后更新完毕之后再去更新下一批容器。

下面是一个使用yaml资源清单设置RollingUpdate策略的案例

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
    name: deploy1
    namespace: dev
    labels:
        app: deploy1
spec:
    replicas: 3
    selector:
        matchLabels:
            app: nginx
    # Pod的升级策略
    strategy:
        # 类型：滚动更新
        type: "RollingUpdate"
    template:
        metadata:
            labels:
                app: nginx
        spec:
            containers:
            - name: nginx1
              image: nginx:1.17.1
              ports:
              - containerPort: 80
                name: nginx-port
```



扩缩容的命令

> kubectl scale deploy [Deployment的名字] --replicas=数量 -n [命名空间]
>



更新镜像的命令

> kubectl set image deploy [Deployment的名字] [容器名字]=[镜像] -n [命名空间]
>



##### 版本回退
Deployment支持版本升级过程中的暂停、继续功能以及版本回退等诸多功能。



其实我们每次更新Deployment的时候，都会给我们创建一个新的RS，然后将新的Pod在新的RS中创建，然后再慢慢的将老的RS中的Pod停掉。所以，k8s中就可以使用RS的版本来进行版本回退。



kubectl rollout 是deployment版本升级相关的命令，支持下面的选项:

+ status:查询当前升级状态
+ history:查询升级历史
+ pause:暂停版本升级过程
+ resume：继续被暂停的升级过程
+ restart：重启版本升级过程
+ undo:回滚到上一个版本（可以使用--to-revision回滚到指定的版本）



版本回退

> kubectl rollout undo deploy [Deployment的名字] -n [命名空间]
>



##### 金丝雀发布
什么是金丝雀发布？

金丝雀发布就是在版本升级的过程中，我们不要让所有的Pod都进行升级，先升级一小部分，然后暂停住升级过程，让部分流量能来到新版本的Pod上来测试我们的功能是否有问题。如果没有问题，那么就可以继续进行版本的升级过程。如果有问题的话则可以进行版本的回退。



下面是一个进行金丝雀发布的命令

> kubectl set image deploy [Deployment名字] [容器名字]=[镜像] -n [命名空间] && kubectl rollout pause deploy [Deployment名字] -n [命名空间]
>



> **<font style="color:#DF2A3F;">注意：！！！！ </font>**
>
> **<font style="color:#DF2A3F;">如果你的Deployment中的升级策略设置的是Recreate重建策略的话，是无法使用金丝雀发布的。</font>**
>





#### 3.3 <font style="color:rgb(51, 51, 51);">Horizontal Pod Autoscaler(</font>HPA)


在前面的Deployment这种Pod控制器中，我们可以手动的通过kubectl scale命令来实现扩缩容，但是这个方法不够智能，需要我们进行人工干预，使用起来非常的不方便。为了实现更加智能化，所以出现了HPA这种Pod控制器。

它其实就是通过**<font style="color:#DF2A3F;">监控Pod消耗的资源是否达到我们设置的阈值来实现自动的扩缩容</font>**。



下面是一个使用yaml资源清单来设置HPA的案例

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
    name: hpa-nginx
    namespace: dev
spec:
  # 最小Pod的副本数
  minReplicas:  1
  # 最大Pod的副本数
  maxReplicas: 10
  # 要扩展的目标资源,这里是通过name=dep-nginx的deployment来进行扩缩容
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: dep-nginx
  # 通过什么指标来进行扩缩容
  metrics:
  # 类型：资源
  - type: Resource
    # 监控消耗CPU资源是否达到3%，达到了就进行扩容
    resource:
      # 监控CPU资源
      name: cpu
      target:
        #百分比
        type: Utilization
        # 当所有pod消耗的资源的平均值达到这个值的时候，引发扩容
        averageUtilization: 3
```


#### 3.4 DaemonSet
这种Pod控制器可以实现将对应的Pod在所有的Node节点上都启动一份，并且**<font style="color:#ED740C;">可以实现当有新的Node节点加入到集群后自动在新的Node上运行Pod</font>**。



下面是一个使用yaml资源清单来设置DaemonSet的案例  


```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: ds-nginx
  namespace: dev
spec:
  # 匹配器，这里是通过pod的label进行匹配
  selector:
    matchLabels:
      app: nginx2
  # pod模板
  template:
    metadata:
      labels:
        app: nginx2
    spec:
      containers:
      - image: nginx:1.17.1
        name: nginx2
        ports:
        - containerPort: 80
          name: nginx2-prort
```



#### 3.5 Job
Job这种Pod控制器可以实现，**<font style="color:#ED740C;">批量执行</font>**<font style="color:#ED740C;">指定数量的</font>**<font style="color:#ED740C;">一次性</font>**<font style="color:#ED740C;">任务</font>。

但是在工作中，基本不会使用Job这种pod控制器来创建pod，一般都会使用专业的定时任务调度平台来启动定时任务，所以了解即可。



下面是一个使用yaml资源清单来设置Job这种Pod控制器的案例



```yaml
apiVersion: batch/v1
kind: Job
metadata:
    name: job1
    namespace: dev
spec:
  # 指定job执行的最大时间，如果超过这个时间没有结束强制终止
  activeDeadlineSeconds: 30
  # 最大重试次数
  backoffLimit: 3
  # 是否开启对pod的selector
  manualSelector: true
  # 要执行几次pod
  completions: 6
  # 并发执行pod的数量
  parallelism: 3
  # pod选择器
  selector:
    matchLabels:
      app: job
  template:
    metadata:
      labels:
        app: job
    spec:
      # 注意： 要明确设置pod的重启策略，只能选择Never或者OnFailure
      restartPolicy: Never
      containers:
      - name: job11
        image: busybox:1.30
        command: ["bin/sh","-c","for i in 9 8 7 6 5 4 3 2 1; do echo $i; sleep 2;done"]
```

> 关于重启策略的补充：
>
> 如果设定重启策略为OnFailure，则job会在pod出现故障后重启容器，但是不会将failed次数加一
>
> 如果设定重启策略为Never,则job会在pod出现故障后创建新的pod，但是原来的pod不会消失，也不会重启，failed次数加一
>
> 不可以设定重启策略为Always
>



#### 3.6 CronJob
CronJob这种Pod控制器其实就是Job这种Pod控制器的再次管理，可以通过Cron表达式来定时执行Job。在现实公司业务中，几乎不会使用这种Pod控制器。



下面是一个使用yaml资源清单来定义CronJob这种Pod控制器的案例



#### 3.7 StatefulSet

StatefulSet是一种用来管理 **有状态应用** 的Pod控制器。

如果我们创建的Pod需要有**稳定的唯一标识**、需要**持久化存储**、需要有**稳定的网络标识**，那么就需要使用StatefulSet这种Pod控制器来创建。



使用StatefulSet这种Pod控制器创建的Pod有以下的几个特点：

1. 名字唯一且有序（也就代表着Pod的DNS唯一固定），比如web-0、web-1...，即使Pod故障重启之后依然保持名字不变。 **默认的名字规则是： [StatefulSet名字]+序号**
2. 需要借助于无头Service
3. 有序部署和销毁，创建的Pod是串行部署和销毁的，不能并行操作
4. 持久化存储借助于PVC-PV机制来实现



常见的有状态的应用，适合使用StatefulSet这种Pod控制器来创建的应用有：

**数据库**：MySQL、PostgreSQL

**消息中间件**： Kafka、RabbitMQ

分布式系统： Zookeeper、Etcd、Consul

 需要**固定网络 ID** 的服务（例如*主从架构*）  



下面是一个使用yaml资源清单来定义StatefulSet这种Pod控制器的案例

```yaml
# 创建Service
apiVersion: v1
kind: Service
metadata:
    name: svc1
    namespace: dev
spec:
    # StatefulSet这种Pod控制器依赖无头Service
    clusterIP: None
    selector:
        app: nginx
    ports:
    -   name: nginx-port
        port: 80
        targetPort: 80
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
    # Pod会根据这个StatefulSet的名字来生成名字
    name: statefulset
    namespace: dev
    labels:
        app: statefulset
spec:
    # 指定StatefulSet依赖的Service的名字
    serviceName: svc1
    replicas: 3
    selector:
        matchLabels:
            app: nginx
    template:
        metadata:
            name: nginx
            namespace: dev
            labels:
                app: nginx
        spec:
            containers:
            - image: nginx:1.17.1
              name: nginx
              imagePullPolicy: IfNotPresent
              ports:
              - name: nginx-port
                containerPort: 80
              volumeMounts:
                  # 这里指定数据存储名字的时候要和下面PVC模板中的name一致
                -  name: www
                   mountPath: /usr/share/nginx/html
    # 定义PVC的创建模板
    volumeClaimTemplates:
    -   metadata:
            # 卷名   生成的实际的PVC名字规则：[name]+[StatefulSet名字]+序号
            name: www
        spec:
            accessModes:
            -   ReadWriteMany
            resources:
                requests:
                    storage: 1Gi
            # 依赖的存储类的名字
            storageClassName: nfs
```



---

### 四、Service详解
什么是Service?

我们前面使用不管是直接创建Pod也好，还是通过Pod控制器来创建Pod也好，创建的Pod的Ip地址是不固定的，每次重建Pod都会有一个新的IP地址，所以我们在外部是不好直接通过写死Pod的IP地址和端口来访问Pod应用的。所以就出现了Service,它就可以**<font style="color:#DF2A3F;">帮我们实现对Pod的服务发现以及负载均衡</font>**。



> 补充：
>
> 其实Service的底层是通过Kube-Proxy来实现的。当我们客户端给api-server发送创建Service请求的时候，api-server会将对应的信息添加到etcd中。然后每个Node上的kube-proxy来通过 **监听机制**来发现这些Service的变动，然后它会_**<font style="color:#DF2A3F;">将最新的Service转换成对应的规则</font>**_。
>

![](https://s3.bmp.ovh/imgs/2025/10/20/68a410821fb1de0b.png)





Service有多种类型，ClusterIP、HeadLiness、NodePort、LoadBalancer、ExternalName

下面就详细介绍一下各种Service类型



#### 4.1 ClusterIP
ClusterIP类型的Service有一个限制，那就是**<font style="color:#DF2A3F;">只能通过集群内部访问</font>**。

下面是一个通过yaml资源清单来定义ClusterIP类型Service的案例



```yaml
apiVersion: v1
kind: Service
metadata:
    name: svc1
    namespace: dev
spec:
    # Service的类型
    type: ClusterIP
    # 如果设置了clusterIP并且type=ClusterIP,那么ClusterIP就用设置的这个，否则会自动生成一个
    clusterIP: 10.97.97.97
    # 通过标签选择器来选择pod
    selector:
      app: nginx
    # 端口规则
    ports:
      # Service暴露的端口
    - port: 80
      # 与Pod中的哪个端口进行对应
      targetPort: 80
```



#### 4.2 HeadLiness类型
其实HeadLiness类型就是ClusterIP类型的一种特殊情况，如果我们**<font style="color:#DF2A3F;">使用type=ClusterIP,并且设置clusterIP=None</font>**的话，就是开启了HeadLiness类型，这种类型只能通过Service的域名来进行访问。



下面是一个使用yaml资源清单来定义HeadLiness类型Service的案例

```yaml
apiVersion: v1
kind: Service
metadata:
  name:svc-nginx
  namespace: dev
spec:
  type: ClusterIP
  clusterIP: None
  selector:
    app: nginx
  ports:
  - port: 80
    targetPort: 80
    
```



#### 4.3 NodePort类型
NodePort与ClusterIP相比，好处是不是只有集群内部可以访问了，而是集群外部也可以通过Node节点的Ip地址+端口访问。

下面是一个使用yaml资源清单，定义NodePort类型的Service的案例

```yaml
apiVersion: v1
kind: Service
metadata:
  name: svc-nginx
  namespace: dev
spec:
  selector:
    app: nginx
  # 类型:NodePort
  type: NodePort
  ports:
  # Service对外暴露的端口
  - port: 80
    # 对Pod的哪个端口进行映射
    targetPort: 80
    # 可以指定整个Node节点对外暴露的端口号
    nodePort: 30001
```





#### 4.4 LoadBalancer类型
LoadBalancer需要借助与外部的一个机器，这个机器专门来做负载均衡，所以一般需要借助于外部云厂商的服务器。





#### 4.5 ExternalName类型


上面的ClusterIP、NodePort类型的Service都是将集群内部的IP和端口暴露给外部使用，而ExternalName则是将**<font style="color:#DF2A3F;">集群外部的IP和端口号映射到集群内部</font>**，让集群内部可以使用。



下面是一个使用yaml资源清单定义ExternalName类型Service的案例

```yaml
apiVersion: v1
kind: Service
metadata:
  name: svc-nginx
  namespace: dev
spec:
  type: ExternalName
  #这里就是外部的地址，可以写域名也可以写IP
  externalName: www.baidu.com
```



### 五、Ingress
Ingress可以理解成对Servcie进行一层代理。我们一个集群中可能有多个Service,每一个Service后面又有多个Pod，所以Ingress就可以帮我们管理多个Service了。

Ingress可以来定义一个映射规则，然后通过Ingress Controller来实现具体的映射。Ingress Controller有多种实现，比如使用最多的就是nginx。

说的通俗易懂点，就是Ingress通过nginx来实现你定义的映射规则，帮你进行了一个转发。



下面是一个使用yaml资源清单来定义Ingress的案例:



首先需要配置前置的Service和Pod,yaml资源清单如下:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: deploy-nginx
  namespace: dev
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - image: nginx:1.17.1
        name: nginx
        ports:
        - containerPort: 80
          name: nginx-port

---

apiVersion: apps/v1
kind: Deployment
metadata:
  name: deploy-tomcat
  namespace: dev
spec:
  replicas: 3
  selector:
    matchLabels:
      app: tomcat
  template:
    metadata:
      labels:
        app: tomcat
    spec:
      containers:
      - image: tomcat:8.5-jre10-slim
        name: tomcat
        ports:
        - containerPort: 8080
    
---

apiVersion: v1
kind: Service
metadata:
  name: svc-nginx
  namespace: dev
spec:
  selector:
    app: nginx
  type: ClusterIP
  clusterIP: None
  ports:
  - port: 80
    targetPort: 80

---
apiVersion: v1
kind: Service
metadata:
  name: svc-tomcat
  namespace: dev
spec:
  selector:
    app: tomcat
  type: ClusterIP
  clusterIP: None
  ports:
  - port: 8080
    targetPort: 8080
```



```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: ing1
  namespace: dev
spec:
  # 映射规则
  rules:
    # 主机地址
  - host: nginx.carl.com
    http:
      paths:
      # 路径
      - path: /
      # 对应转发到哪里的后台
        backend:
          # 来映射到Service
          service:
            # 映射到的Service的名字
            name: svc-nginx
            # 映射到的Service的暴露端口
            port: 80
```



但是如果要想使用Ingress，那么你需要先安装对应的controller,下面是安装Ingress-nginx的案例

```shell
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.9.4/deploy/static/provider/cloud/deploy.yaml
```



对应的yaml内容如下:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  labels:
    app.kubernetes.io/instance: ingress-nginx
    app.kubernetes.io/name: ingress-nginx
  name: ingress-nginx
---
apiVersion: v1
automountServiceAccountToken: true
kind: ServiceAccount
metadata:
  labels:
    app.kubernetes.io/component: controller
    app.kubernetes.io/instance: ingress-nginx
    app.kubernetes.io/name: ingress-nginx
    app.kubernetes.io/part-of: ingress-nginx
    app.kubernetes.io/version: 1.9.4
  name: ingress-nginx
  namespace: ingress-nginx
---
apiVersion: v1
kind: ServiceAccount
metadata:
  labels:
    app.kubernetes.io/component: admission-webhook
    app.kubernetes.io/instance: ingress-nginx
    app.kubernetes.io/name: ingress-nginx
    app.kubernetes.io/part-of: ingress-nginx
    app.kubernetes.io/version: 1.9.4
  name: ingress-nginx-admission
  namespace: ingress-nginx
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  labels:
    app.kubernetes.io/component: controller
    app.kubernetes.io/instance: ingress-nginx
    app.kubernetes.io/name: ingress-nginx
    app.kubernetes.io/part-of: ingress-nginx
    app.kubernetes.io/version: 1.9.4
  name: ingress-nginx
  namespace: ingress-nginx
rules:
- apiGroups:
  - ""
  resources:
  - namespaces
  verbs:
  - get
- apiGroups:
  - ""
  resources:
  - configmaps
  - pods
  - secrets
  - endpoints
  verbs:
  - get
  - list
  - watch
- apiGroups:
  - ""
  resources:
  - services
  verbs:
  - get
  - list
  - watch
- apiGroups:
  - networking.k8s.io
  resources:
  - ingresses
  verbs:
  - get
  - list
  - watch
- apiGroups:
  - networking.k8s.io
  resources:
  - ingresses/status
  verbs:
  - update
- apiGroups:
  - networking.k8s.io
  resources:
  - ingressclasses
  verbs:
  - get
  - list
  - watch
- apiGroups:
  - coordination.k8s.io
  resourceNames:
  - ingress-nginx-leader
  resources:
  - leases
  verbs:
  - get
  - update
- apiGroups:
  - coordination.k8s.io
  resources:
  - leases
  verbs:
  - create
- apiGroups:
  - ""
  resources:
  - events
  verbs:
  - create
  - patch
- apiGroups:
  - discovery.k8s.io
  resources:
  - endpointslices
  verbs:
  - list
  - watch
  - get
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  labels:
    app.kubernetes.io/component: admission-webhook
    app.kubernetes.io/instance: ingress-nginx
    app.kubernetes.io/name: ingress-nginx
    app.kubernetes.io/part-of: ingress-nginx
    app.kubernetes.io/version: 1.9.4
  name: ingress-nginx-admission
  namespace: ingress-nginx
rules:
- apiGroups:
  - ""
  resources:
  - secrets
  verbs:
  - get
  - create
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  labels:
    app.kubernetes.io/instance: ingress-nginx
    app.kubernetes.io/name: ingress-nginx
    app.kubernetes.io/part-of: ingress-nginx
    app.kubernetes.io/version: 1.9.4
  name: ingress-nginx
rules:
- apiGroups:
  - ""
  resources:
  - configmaps
  - endpoints
  - nodes
  - pods
  - secrets
  - namespaces
  verbs:
  - list
  - watch
- apiGroups:
  - coordination.k8s.io
  resources:
  - leases
  verbs:
  - list
  - watch
- apiGroups:
  - ""
  resources:
  - nodes
  verbs:
  - get
- apiGroups:
  - ""
  resources:
  - services
  verbs:
  - get
  - list
  - watch
- apiGroups:
  - networking.k8s.io
  resources:
  - ingresses
  verbs:
  - get
  - list
  - watch
- apiGroups:
  - ""
  resources:
  - events
  verbs:
  - create
  - patch
- apiGroups:
  - networking.k8s.io
  resources:
  - ingresses/status
  verbs:
  - update
- apiGroups:
  - networking.k8s.io
  resources:
  - ingressclasses
  verbs:
  - get
  - list
  - watch
- apiGroups:
  - discovery.k8s.io
  resources:
  - endpointslices
  verbs:
  - list
  - watch
  - get
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  labels:
    app.kubernetes.io/component: admission-webhook
    app.kubernetes.io/instance: ingress-nginx
    app.kubernetes.io/name: ingress-nginx
    app.kubernetes.io/part-of: ingress-nginx
    app.kubernetes.io/version: 1.9.4
  name: ingress-nginx-admission
rules:
- apiGroups:
  - admissionregistration.k8s.io
  resources:
  - validatingwebhookconfigurations
  verbs:
  - get
  - update
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  labels:
    app.kubernetes.io/component: controller
    app.kubernetes.io/instance: ingress-nginx
    app.kubernetes.io/name: ingress-nginx
    app.kubernetes.io/part-of: ingress-nginx
    app.kubernetes.io/version: 1.9.4
  name: ingress-nginx
  namespace: ingress-nginx
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: ingress-nginx
subjects:
- kind: ServiceAccount
  name: ingress-nginx
  namespace: ingress-nginx
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  labels:
    app.kubernetes.io/component: admission-webhook
    app.kubernetes.io/instance: ingress-nginx
    app.kubernetes.io/name: ingress-nginx
    app.kubernetes.io/part-of: ingress-nginx
    app.kubernetes.io/version: 1.9.4
  name: ingress-nginx-admission
  namespace: ingress-nginx
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: ingress-nginx-admission
subjects:
- kind: ServiceAccount
  name: ingress-nginx-admission
  namespace: ingress-nginx
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  labels:
    app.kubernetes.io/instance: ingress-nginx
    app.kubernetes.io/name: ingress-nginx
    app.kubernetes.io/part-of: ingress-nginx
    app.kubernetes.io/version: 1.9.4
  name: ingress-nginx
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: ingress-nginx
subjects:
- kind: ServiceAccount
  name: ingress-nginx
  namespace: ingress-nginx
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  labels:
    app.kubernetes.io/component: admission-webhook
    app.kubernetes.io/instance: ingress-nginx
    app.kubernetes.io/name: ingress-nginx
    app.kubernetes.io/part-of: ingress-nginx
    app.kubernetes.io/version: 1.9.4
  name: ingress-nginx-admission
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: ingress-nginx-admission
subjects:
- kind: ServiceAccount
  name: ingress-nginx-admission
  namespace: ingress-nginx
---
apiVersion: v1
data:
  allow-snippet-annotations: "false"
kind: ConfigMap
metadata:
  labels:
    app.kubernetes.io/component: controller
    app.kubernetes.io/instance: ingress-nginx
    app.kubernetes.io/name: ingress-nginx
    app.kubernetes.io/part-of: ingress-nginx
    app.kubernetes.io/version: 1.9.4
  name: ingress-nginx-controller
  namespace: ingress-nginx
---
apiVersion: v1
kind: Service
metadata:
  labels:
    app.kubernetes.io/component: controller
    app.kubernetes.io/instance: ingress-nginx
    app.kubernetes.io/name: ingress-nginx
    app.kubernetes.io/part-of: ingress-nginx
    app.kubernetes.io/version: 1.9.4
  name: ingress-nginx-controller
  namespace: ingress-nginx
spec:
  externalTrafficPolicy: Local
  ipFamilies:
  - IPv4
  ipFamilyPolicy: SingleStack
  ports:
  - appProtocol: http
    name: http
    port: 80
    protocol: TCP
    targetPort: http
  - appProtocol: https
    name: https
    port: 443
    protocol: TCP
    targetPort: https
  selector:
    app.kubernetes.io/component: controller
    app.kubernetes.io/instance: ingress-nginx
    app.kubernetes.io/name: ingress-nginx
  type: LoadBalancer
---
apiVersion: v1
kind: Service
metadata:
  labels:
    app.kubernetes.io/component: controller
    app.kubernetes.io/instance: ingress-nginx
    app.kubernetes.io/name: ingress-nginx
    app.kubernetes.io/part-of: ingress-nginx
    app.kubernetes.io/version: 1.9.4
  name: ingress-nginx-controller-admission
  namespace: ingress-nginx
spec:
  ports:
  - appProtocol: https
    name: https-webhook
    port: 443
    targetPort: webhook
  selector:
    app.kubernetes.io/component: controller
    app.kubernetes.io/instance: ingress-nginx
    app.kubernetes.io/name: ingress-nginx
  type: ClusterIP
---
apiVersion: apps/v1
kind: Deployment
metadata:
  labels:
    app.kubernetes.io/component: controller
    app.kubernetes.io/instance: ingress-nginx
    app.kubernetes.io/name: ingress-nginx
    app.kubernetes.io/part-of: ingress-nginx
    app.kubernetes.io/version: 1.9.4
  name: ingress-nginx-controller
  namespace: ingress-nginx
spec:
  minReadySeconds: 0
  revisionHistoryLimit: 10
  selector:
    matchLabels:
      app.kubernetes.io/component: controller
      app.kubernetes.io/instance: ingress-nginx
      app.kubernetes.io/name: ingress-nginx
  strategy:
    rollingUpdate:
      maxUnavailable: 1
    type: RollingUpdate
  template:
    metadata:
      labels:
        app.kubernetes.io/component: controller
        app.kubernetes.io/instance: ingress-nginx
        app.kubernetes.io/name: ingress-nginx
        app.kubernetes.io/part-of: ingress-nginx
        app.kubernetes.io/version: 1.9.4
    spec:
      containers:
      - args:
        - /nginx-ingress-controller
        - --publish-service=$(POD_NAMESPACE)/ingress-nginx-controller
        - --election-id=ingress-nginx-leader
        - --controller-class=k8s.io/ingress-nginx
        - --ingress-class=nginx
        - --configmap=$(POD_NAMESPACE)/ingress-nginx-controller
        - --validating-webhook=:8443
        - --validating-webhook-certificate=/usr/local/certificates/cert
        - --validating-webhook-key=/usr/local/certificates/key
        env:
        - name: POD_NAME
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        - name: POD_NAMESPACE
          valueFrom:
            fieldRef:
              fieldPath: metadata.namespace
        - name: LD_PRELOAD
          value: /usr/local/lib/libmimalloc.so
        image: registry.k8s.io/ingress-nginx/controller:v1.9.4@sha256:5b161f051d017e55d358435f295f5e9a297e66158f136321d9b04520ec6c48a3
        imagePullPolicy: IfNotPresent
        lifecycle:
          preStop:
            exec:
              command:
              - /wait-shutdown
        livenessProbe:
          failureThreshold: 5
          httpGet:
            path: /healthz
            port: 10254
            scheme: HTTP
          initialDelaySeconds: 10
          periodSeconds: 10
          successThreshold: 1
          timeoutSeconds: 1
        name: controller
        ports:
        - containerPort: 80
          name: http
          protocol: TCP
        - containerPort: 443
          name: https
          protocol: TCP
        - containerPort: 8443
          name: webhook
          protocol: TCP
        readinessProbe:
          failureThreshold: 3
          httpGet:
            path: /healthz
            port: 10254
            scheme: HTTP
          initialDelaySeconds: 10
          periodSeconds: 10
          successThreshold: 1
          timeoutSeconds: 1
        resources:
          requests:
            cpu: 100m
            memory: 90Mi
        securityContext:
          allowPrivilegeEscalation: true
          capabilities:
            add:
            - NET_BIND_SERVICE
            drop:
            - ALL
          runAsUser: 101
        volumeMounts:
        - mountPath: /usr/local/certificates/
          name: webhook-cert
          readOnly: true
      dnsPolicy: ClusterFirst
      nodeSelector:
        kubernetes.io/os: linux
      serviceAccountName: ingress-nginx
      terminationGracePeriodSeconds: 300
      volumes:
      - name: webhook-cert
        secret:
          secretName: ingress-nginx-admission
---
apiVersion: batch/v1
kind: Job
metadata:
  labels:
    app.kubernetes.io/component: admission-webhook
    app.kubernetes.io/instance: ingress-nginx
    app.kubernetes.io/name: ingress-nginx
    app.kubernetes.io/part-of: ingress-nginx
    app.kubernetes.io/version: 1.9.4
  name: ingress-nginx-admission-create
  namespace: ingress-nginx
spec:
  template:
    metadata:
      labels:
        app.kubernetes.io/component: admission-webhook
        app.kubernetes.io/instance: ingress-nginx
        app.kubernetes.io/name: ingress-nginx
        app.kubernetes.io/part-of: ingress-nginx
        app.kubernetes.io/version: 1.9.4
      name: ingress-nginx-admission-create
    spec:
      containers:
      - args:
        - create
        - --host=ingress-nginx-controller-admission,ingress-nginx-controller-admission.$(POD_NAMESPACE).svc
        - --namespace=$(POD_NAMESPACE)
        - --secret-name=ingress-nginx-admission
        env:
        - name: POD_NAMESPACE
          valueFrom:
            fieldRef:
              fieldPath: metadata.namespace
        image: registry.k8s.io/ingress-nginx/kube-webhook-certgen:v20231011-8b53cabe0@sha256:a7943503b45d552785aa3b5e457f169a5661fb94d82b8a3373bcd9ebaf9aac80
        imagePullPolicy: IfNotPresent
        name: create
        securityContext:
          allowPrivilegeEscalation: false
      nodeSelector:
        kubernetes.io/os: linux
      restartPolicy: OnFailure
      securityContext:
        fsGroup: 2000
        runAsNonRoot: true
        runAsUser: 2000
      serviceAccountName: ingress-nginx-admission
---
apiVersion: batch/v1
kind: Job
metadata:
  labels:
    app.kubernetes.io/component: admission-webhook
    app.kubernetes.io/instance: ingress-nginx
    app.kubernetes.io/name: ingress-nginx
    app.kubernetes.io/part-of: ingress-nginx
    app.kubernetes.io/version: 1.9.4
  name: ingress-nginx-admission-patch
  namespace: ingress-nginx
spec:
  template:
    metadata:
      labels:
        app.kubernetes.io/component: admission-webhook
        app.kubernetes.io/instance: ingress-nginx
        app.kubernetes.io/name: ingress-nginx
        app.kubernetes.io/part-of: ingress-nginx
        app.kubernetes.io/version: 1.9.4
      name: ingress-nginx-admission-patch
    spec:
      containers:
      - args:
        - patch
        - --webhook-name=ingress-nginx-admission
        - --namespace=$(POD_NAMESPACE)
        - --patch-mutating=false
        - --secret-name=ingress-nginx-admission
        - --patch-failure-policy=Fail
        env:
        - name: POD_NAMESPACE
          valueFrom:
            fieldRef:
              fieldPath: metadata.namespace
        image: registry.k8s.io/ingress-nginx/kube-webhook-certgen:v20231011-8b53cabe0@sha256:a7943503b45d552785aa3b5e457f169a5661fb94d82b8a3373bcd9ebaf9aac80
        imagePullPolicy: IfNotPresent
        name: patch
        securityContext:
          allowPrivilegeEscalation: false
      nodeSelector:
        kubernetes.io/os: linux
      restartPolicy: OnFailure
      securityContext:
        fsGroup: 2000
        runAsNonRoot: true
        runAsUser: 2000
      serviceAccountName: ingress-nginx-admission
---
apiVersion: networking.k8s.io/v1
kind: IngressClass
metadata:
  labels:
    app.kubernetes.io/component: controller
    app.kubernetes.io/instance: ingress-nginx
    app.kubernetes.io/name: ingress-nginx
    app.kubernetes.io/part-of: ingress-nginx
    app.kubernetes.io/version: 1.9.4
  name: nginx
spec:
  controller: k8s.io/ingress-nginx
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  labels:
    app.kubernetes.io/component: admission-webhook
    app.kubernetes.io/instance: ingress-nginx
    app.kubernetes.io/name: ingress-nginx
    app.kubernetes.io/part-of: ingress-nginx
    app.kubernetes.io/version: 1.9.4
  name: ingress-nginx-admission
  namespace: ingress-nginx
spec:
  egress:
  - {}
  podSelector:
    matchLabels:
      app.kubernetes.io/component: admission-webhook
      app.kubernetes.io/instance: ingress-nginx
      app.kubernetes.io/name: ingress-nginx
  policyTypes:
  - Ingress
  - Egress
---
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingWebhookConfiguration
metadata:
  labels:
    app.kubernetes.io/component: admission-webhook
    app.kubernetes.io/instance: ingress-nginx
    app.kubernetes.io/name: ingress-nginx
    app.kubernetes.io/part-of: ingress-nginx
    app.kubernetes.io/version: 1.9.4
  name: ingress-nginx-admission
webhooks:
- admissionReviewVersions:
  - v1
  clientConfig:
    service:
      name: ingress-nginx-controller-admission
      namespace: ingress-nginx
      path: /networking/v1/ingresses
  failurePolicy: Fail
  matchPolicy: Equivalent
  name: validate.nginx.ingress.kubernetes.io
  rules:
  - apiGroups:
    - networking.k8s.io
    apiVersions:
    - v1
    operations:
    - CREATE
    - UPDATE
    resources:
    - ingresses
  sideEffects: None
```



上面的案例是通过http请求来访问ingress的，下面的案例是通过https请求来访问ingress，然后让ingress代理到各个Service



1. 先创建证书

```powershell
# 生成证书
openssl req -x509 -sha256 -nodes -days 365 -newkey rsa:2048 -keyout tls.key -out tls.crt -subj "/C=CN/ST=BJ/L=BJ/O=nginx/CN=itheima.com"

# 创建密钥
kubectl create secret tls tls-secret --key tls.key --cert tls.crt
```

2. 定义yaml资源清单

```yaml
apiVersion: extensions/v1beta1
kind: Ingress
metadata:
  name: ingress-https
  namespace: dev
spec:
  # 如果有tls，那么就是Https请求
  tls:
    - hosts:
      - nginx.itheima.com
      - tomcat.itheima.com
      secretName: tls-secret # 指定秘钥
  rules:
  - host: nginx.itheima.com
    http:
      paths:
      - path: /
        backend:
          serviceName: nginx-service
          servicePort: 80
  - host: tomcat.itheima.com
    http:
      paths:
      - path: /
        backend:
          serviceName: tomcat-service
          servicePort: 8080
```



### 六、数据存储


#### 6.1 EmptyDir
EmptyDir这种类型的数据卷的特点是：同一个Pod中的多个容器可以共享数据，但是是和Pod的生命周期相关的。一旦Pod销毁的时候，这个数据卷也就销毁了。



下面是一个使用yaml资源清单来定义EmptyDir数据卷的案例

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: test1
  namespace: dev
spec:
  containers:
  - name: nginx
    image: nginx:1.17.1
    #容器挂载的数据卷列表
    volumeMounts:
      # 要将容器内的哪个目录挂载出去
    - mountPath: /var/log/nginx
      # 数据卷的名字
      name: pod1-volumes
    ports:
    - containerPort: 80
      name: nginx-port
  - name: busybox
    image: busybox:1.30
    command: ["/bin/sh","-c","tail -f /logs/access.log"]
    volumeMounts:
    - name: pod1-volumes
      mountPath: /logs
  # 数据卷定义
  volumes:
    # 数据卷的名字
  - name: pod1-volumes
    # 这里指定是emptyDir类型
    emptyDir: {}
```



#### 6.2 hostPath
hostPath这种类型的数据卷，顾名思义那就是放在Node机器上的数据卷，Pod销毁之后这个数据卷也不会被丢失，只有当Node机器挂掉了之后才会进行销毁。



下面是一个使用yaml资源清单来定义hostPath类型数据卷的案例

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: test1
  namespace: dev
spec:
  containers:
  - name: nginx
    image: nginx:1.17.1
    volumeMounts:
    - mountPath: /var/log/nginx
      name: pod1-volumes
    ports:
    - containerPort: 80
      name: nginx-port
  - name: busybox
    image: busybox:1.30
    command: ["/bin/sh","-c","tail -f /logs/access.log"]
    volumeMounts:
    - name: pod1-volumes
      mountPath: /logs
  volumes:
  - name: pod2-volumes
    # 使用的是hostPath这种类型的数据卷 
    hostPath:
      # 将数据存放在哪个目录下
      path: /logs
      # 文件夹策略，这里是如果不存在就创建
      type: DirectoryOrCreate
```



#### 6.3 NFS
上面的hostPath还是存在一个问题，就是当我们的Node节点发生故障之后，Pod会重新创建，新创建的Pod可能就调度到别的Node节点上了，此时原来Node中的数据对于这个Pod来说就没有了。所以出现了NFS这种类型的数据存储。

NFS这种数据存储，其实就是使用一个额外的网络存储文件系统比如NFS服务器来存储数据，这样不管你集群中的哪个Node节点出现了故障，都不会导致数据丢失。



下面是一个使用yaml资源清单来定义NFS类型的数据存储的案例

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: test1
  namespace: dev
spec:
  containers:
  - name: nginx
    image: nginx:1.17.1
    volumeMounts:
    - mountPath: /var/log/nginx
      name: pod1-volumes
    ports:
    - containerPort: 80
      name: nginx-port
  - name: busybox
    image: busybox:1.30
    command: ["/bin/sh","-c","tail -f /logs/access.log"]
    volumeMounts:
    - name: pod1-volumes
      mountPath: /logs
  volumes:
  - name: pod2-volumes
    # 使用nfs这种类型的数据存储
    nfs:
      # 将数据放在哪个目录下
      path: /logs
      # nfs服务器的主机地址
      server: 192.168.10.3
```



#### 6.4 PersistentVolume（PV）
上面的各种存储比较靠谱的还得是NFS这种类型的存储。但是对于用户来说这种借助网络存储服务器来存储数据的有太多方案了，用户使用k8s可能不需要掌握所有的这些存储，所以就出现了PV。



如果使用通俗的话来解释一下PV？

PV就是**<font style="color:#DF2A3F;">对底层网络文件存储服务器方案（比如NFS）的一种抽象</font>**。隐藏了底层使用什么来进行存储，只需要定义我里面有多大的容量以及使用的什么存储就可以。类似于spring cloud stream来把底层的MQ进行封装一样。



下面是一个使用yaml资源来定义PV的案例

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: pv1
spec:
  # 容量
  capacity:
    # 存储大小1G
    storage: 1Gi
  #底层使用的NFS方式
  nfs:
    # nfs方式中文件夹的位置
    path: /logs/pv1
    # nfs服务器地址
    server: 192.168.10.10
  # 访问模式：
  # ReadWriteOnce:读写权限，但是只能被一个Node节点访问
  # ReadOnlyMany: 只读权限，可以被多个Node节点访问
  # ReadWriteMany: 读写权限，可以被多个Node节点访问
  accessModes:
  - ReadWriteMany
  # 回收策略，当对应的PVC不对这个PV进行挂载之后PV中的数据如何处理
  # Retain: 保留，需要管理员手动清理数据
  # Recycle: 回收。清除PV中的数据，效果相当于执行了 rm -rf /thevolume/*
  # Delete:删除。 与PV相连的后端存储完成volume的删除，常见于云厂商的存储服务中
  persistentVolumeReclaimPolicy: Retain
---
apiVersion: v1
kind: PersistentVolume
metadata:
  name: pv2
spec:
  nfs:
    path: /logs/pv2
    server: 192.168.10.10
  capacity:
    storage: 2Gi
  accessModes:
  - ReadWriteMany
  persistentVolumeReclaimPolicy: Retain

---
apiVersion: v1
kind: PersistentVolume
metadata:
  name: pv3
spec:
  capacity:
    storage: 3Gi
  nfs:
    path: /logs/pv3
    server: 192.168.10.10
  accessModes:
  - ReadWriteMany
  persistentVolumeReclaimPolicy: Retain
```





#### 6.5 PVC
PVC通过选择来绑定对应的PV，然后就可以将数据存储到对应的PV上了。

> 注意：！！！！
>
> **<font style="color:#DF2A3F;">PVC和PV的绑定关系是一对一的</font>**！！！
>



PVC中可以定义需要存储空间的大小，然后k8s会自动找到最合适的PV然后进行绑定。

补充：

> 刚才在上面讲解PV的时候说的访问模式，在这里进行补充，方便大家进行更好的理解。
>
> 1.PVC和PV的绑定关系是一对一的
>
> 2.Pod和PVC的绑定关系是一对多的，多个Pod可以绑定同一个PVC
>
> 3.PV中的访问模式是来控制的Node节点，比如你的访问模式设置的是ReadWriteOnce,然后你在两个Pod中使用了这相同的PVC，然后pod1调度在了Node1上，Pod2调度在了Node2上，当Pod2想要去使用PV的时候就会被PV的访问模式拒绝。
>
> 
>



下面是一个使用yaml资源清单来定义PVC的案例

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
    name: pvc
    namespace: dev
spec:
    accessModes:
    - ReadWriteMany
    resources:
        requests:
            storage: 1Gi
```



PV的生命周期

1. <font style="color:rgb(51, 51, 51);">Available(可用)：当PV被创建后的状态</font>
2. <font style="color:rgb(51, 51, 51);">Bound(绑定)：当PVC与PV绑定之后的状态</font>
3. <font style="color:rgb(51, 51, 51);">Released(已释放):当PVC与PV进行解绑，但是资源还未被集群重新声明</font>
4. <font style="color:rgb(51, 51, 51);">Failed(失败)：当PV中的资源回收失败后的状态</font>

![](https://s3.bmp.ovh/imgs/2025/10/22/013505d28366a96a.png)

<font style="color:rgb(81, 90, 110);background-color:rgb(245, 247, 249);"></font>



#### <font style="color:rgb(51, 51, 51);">6.6 ConfigMap</font>

ConfigMap这种数据存储主要就是来存储配置信息的。

下面是一个使用yaml资源清单定义ConfigMap配置信息的案例

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: configmap
  namespace: dev
# 配置数据
data:
  USER_NAME: "admin"
  PASS_WORD: "123456"

```

创建一个pod来使用它

```yaml
apiVersion: v1
kind: Pod
metadata:
    name: nginx
    namespace: dev
spec:
    containers:
    - image: nginx:1.17.1
      name: nginx
      ports:
      - containerPort: 80
        name: nginx-port
      # 容器挂载的数据卷的配置
      volumeMounts:
        # volume的名字
      - name: config
        # 和哪个目录进行对应
        mountPath: /configmap/config
    # 数据卷配置
    volumes:
       # 名字，注意！！一定要和上面你定义的volumeMounts中的name对应
    -  name: config
        # 使用configMap来作为数据存储器
       configMap:
        # 注意！！一定要和上面你定义的volumeMounts中的name对应
        name: configmap
```



然后可以执行下面的命令进入到pod内部，然后查看是否有对应的配置

> kubectl exec -it -n [名称空间] [pod名字] -- /bin/sh
>



#### 6.7 Secret
在上面说的ConfigMap中，我们在配置信息中写的是明文，而Secret无非是你可以写入一些编码后的数据，然后在读取的时候它会自动帮你解密成明文，增加了数据的安全性。

下面是一个使用yaml资源清单来定义Secret的案例

```yaml
apiVersion: v1
kind: Secret
metadata:
    name: secret
    namespace: dev
data:
    # 这里可以写加密数据
    username: YWRtaW4=
    password: MTIzNDU2
# 指定解密用的算法
type: Opaque
```



定义一个pod

```yaml
apiVersion: v1
kind: Pod
metadata:
    name: nginx2
    namespace: dev
spec:
    containers:
    - image: nginx:1.17.1
      name: nginx2
      ports:
      - containerPort: 80
      volumeMounts:
      - name: secret
        mountPath: /secret/config
    volumes:
       # 存储的名字
    -  name: secret
       # 使用secret类型作为存储 
       secret:
         # 对应上面定义的secret的名字
         secretName: secret
```



然后可以执行下面的命令进入到pod内部，然后查看是否有对应的配置

> kubectl exec -it -n [名称空间] [pod名字] -- /bin/sh
>





