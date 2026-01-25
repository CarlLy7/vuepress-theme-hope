---
title: Jenkins+Kubernets实现CI/CD
date: 2025-11-19
icon: lucide:bird
order: 1
---


## Jenkins+Kubernets实现CI/CD



#### 开篇话： 

 最近一段时间自己在学习Jenkins和k8s整合实现微服务和前端vue项目的CI/CD流程，之前也断断续续的学习过，但是总是被一些其他的事情打断导致一直没有进行系统化的实操和学习，刚好最近有时间就重新系统化的学习一遍并且自己实操了一遍。作此笔记来进行记录一下。



#### 一、机器编排

  	首先在开始Jenkins+k8s实现CI/CD之前，我们是需要合理的规划一下机器的。我这里暂时使用了五台机器来进行学习，下面是我对整个机器集群的编排记录。

> 我也强烈推荐一下大家，尤其是你有操作服务器的权限以及有一定的部署需求的时候，
>
> _**<font style="color:#DF2A3F;">一定要先进行机器的编排！！！！</font>**_
>



1. **K8s集群机器的编排**

| 名称 |  机器IP |  用户名 |  密码 |
| --- | --- | --- | --- |
| Master | 192.168.20.100 | root | 123456 |
| Node1 | 192.168.20.101 | root | 123456 |
| Node2 | 192.168.20.102 | root | 123456 |


​	针对K8s集群的搭建，我是使用**kubeadm**来进行搭建的集群环境的，如果想要学习可以去看我的另一篇笔记。

​	[使用Kubeadm安装k8s集群的步骤](http://carllyq.top/2025/10/12/%E4%BD%BF%E7%94%A8kubeadm%E5%AE%89%E8%A3%85k8s%E9%9B%86%E7%BE%A4%E7%9A%84%E6%AD%A5%E9%AA%A4/)



2. **Jenkins系列的机器编排**

| 名称 | 机器IP | 用户名 | 密码 |
| --- | --- | --- | --- |
| Jenkins+Sonarqube | 192.168.20.105 | root | 123456 |
| Gitlab+Harbor+nacos+mysql+redis | 192.168.20.106 | root | 123456 |



#### 二、Jenkins安装

1. **通过清华镜像网站下载jenkins**

   [清华镜像-jenkins-rpm](https://mirrors.tuna.tsinghua.edu.cn/jenkins/redhat-stable/jenkins-2.528.2-1.1.noarch.rpm)



2. **安装jenkins**

   使用rpm -ivh命令来进行安装jenkins的rpm

> rpm -ivh xxxx
>



3. **安装插件**

   下面我简单的列举一些我在Jenkins中使用到的插件

> 1.汉化插件
>
> 2.Jenkins中的权限管理的插件:<font style="color:rgb(51,51,51);">Role-based Authorization Strategy</font>
>
> <font style="color:rgb(51,51,51);">3.凭证插件：Credentials Binding</font>
>
> <font style="color:rgb(51,51,51);">4.Git插件：Git</font>
>
> <font style="color:rgb(51,51,51);">5.流水线插件：Pipeline</font>
>
> <font style="color:rgb(51,51,51);">6.如何想要使用gitlab的hook来进行发布的话，可以下载Gitlab+Gitlab Hook两个插件</font>
>
> <font style="color:rgb(51,51,51);">7.Sonar扫描插件：SonarQube Scanner</font>
>
> <font style="color:rgb(51,51,51);">8.ssh远程连接插件：Publish Over SSH</font>
>
> <font style="color:rgb(51,51,51);">9.Nodejs插件：NodeJS</font>
>
> <font style="color:rgb(51,51,51);">10.多选框参数插件（可以实现同时部署多个服务）：Extended Choice Parameter</font>
>



#### 三、安装Gitlab

1. **安装需要的依赖**

```shell
yum -y install policycoreutils openssh-server openssh-clients postfix
```



2. **启动ssh服务设置为开机启动**

```shell
systemctl enable sshd && sudo systemctl start sshd
```



3. **设置postfix开启启动，并启动postfix支持gitlab发送功能**

```shell
systemctl enable postfix && systemctl start postfix
```



4. **关闭防火墙（生产慎用）**

```shell
systemctl stop firewalld
systemctl disable firewalld
```



5. **下载gitlab安装包以及安装**

```shell
wget https://mirrors.tuna.tsinghua.edu.cn/gitlab-ce/yum/el7/gitlab-ce-12.4.2-ce.0.el7.x86_64.rpm
```

 

​	安装

```shell
rpm -ivh xxxx
```



6. **修改gitlab配置**

```shell
vi /etc/gitlab/gitlab.rb
#修改访问地址和端口，我这里监听82端口，你可以自己根据需求修改
external_url 'http://192.168.20.106:82'
nginx['listen_port'] = 82
```



7. **重载配置及启动gitlab**

```shell
#一定要执行这个命令，不然不会生效的
gitlab-ctl reconfigure
gitlab-ctl restart
```



#### 四、安装Harbor

1. **下载安装包**

      去github上下载对应的harbor版本，然后上传到服务器然后解压即可，目前我使用的版本为v1.9.2（可以根据自己需要自行选择）

下面给出github上的地址

[harborv1.9.2](https://github.com/goharbor/harbor/releases/tag/v1.9.2)



> 补充：
>
> harbor的安装需要依赖于**docker**和**docker-compose**，所以需要先行安装这两个
>
> docker的安装可以看kubeadm安装k8s集群这个文章
>
> docker-compose的安装可以去github下载对应的版本然后上传到服务器然后进行解压，目前我在这里使用的版本为v1.21.2，你可以自行选择版本
>
> 下面给出对应的github的地址：
>
> [docker compose v1.21.2](https://github.com/docker/compose/releases/tag/1.21.2)
>
> <font style="color:#DF2A3F;">将解压后的文件赋予可执行权限，然后放在</font><font style="color:#DF2A3F;">/usr/local/bin/docker-compose</font>
>



2. **修改配置**

> <font style="color:rgb(119,119,119);">vi harbor.yml</font>
>

<font style="color:rgb(51,51,51);">	修改</font><font style="color:rgb(51,51,51);">hostname</font><font style="color:rgb(51,51,51);">和</font><font style="color:rgb(51,51,51);">port </font>

> <font style="color:rgb(119,119,119);">hostname: 192.168.20.106</font>
>
> <font style="color:rgb(119,119,119);">port: 85</font>
>

<font style="color:rgb(119,119,119);"></font>

3. **<font style="color:rgb(51,51,51);">安装Harbor</font>**

> <font style="color:rgb(119,119,119);">./prepare </font>
>
> <font style="color:rgb(119,119,119);">./install.sh</font>



4. **运行harbor**

> <font style="color:rgb(119,119,119);">docker-compose up -d</font>

<font style="color:rgb(119,119,119);">Harbor的默认账号和密码是：</font><font style="color:rgb(51,51,51);">admin/Harbor12345</font>



#### 五、安装Sonarqube

1. **使用docker compose 安装sonarqube**

> **<font style="color:#DF2A3F;">注意：</font>**
>
> **<font style="color:#DF2A3F;">sonarqube8.x版本不支持MySQL数据库了，这里需要使用postgres</font>**
>



```yaml
version: '3'
services:
  postgres:
    image: postgres:12
    container_name: postgres
    restart: always
    privileged: true
    volumes:
      - ./postgres/postgresql:/var/lib/postgresql
      - ./postgres/data:/var/lib/postgresql/data
      - /etc/localtime:/etc/localtime:ro
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: sonar 
      POSTGRES_PASSWORD: sonar 
      POSTGRES_DB: sonar 
      TZ: Asia/Shanghai

  sonar:
    image: sonarqube:8.9.10-community
    container_name: sonar
    restart: always
    privileged: true
    depends_on:
      - postgres 
    volumes:
      - ./sonarqube/logs:/opt/sonarqube/logs
      - ./sonarqube/conf:/opt/sonarqube/conf
      - ./sonarqube/data:/opt/sonarqube/data
      - ./sonarqube/extensions:/opt/sonarqube/extensions
    ports:
      - "9000:9000"
    environment:
      SONARQUBE_JDBC_USERNAME: sonar
      SONARQUBE_JDBC_PASSWORD: sonar
      SONARQUBE_JDBC_URL: "jdbc:postgresql://postgres:5432/sonar"
```



2. **安装Sonarqube的插件**
    1. **安装拉取分支插件**
        默认社区版只能拉取主分支，如果我们要拉取其他分支需要安装插件。
    
      **<font style="color:#DF2A3F;">注意版本要对应。</font>**下面是我这个版本sonarqube对应的插件版本地址
    
      [sonarqube拉取分支插件地址](https://github.com/mc1arke/sonarqube-community-branch-plugin/releases/1.8.0)
    
      然后挂载到对应的目录：**<font style="color:#DF2A3F;background-color:rgb(250, 250, 250);">/opt/sonarqube/sonarqube/extensions/plugins</font>**
    
      添加配置文件：

```shell
#添加配置文件
cd /opt/sonarqube/sonarqube/conf
cat > sonar.properties <<EOF
sonar.web.javaAdditionalOpts=-javaagent:./extensions/plugins/sonarqube-community-branch-plugin-1.8.0.jar=web
sonar.ce.javaAdditionalOpts=-javaagent:./extensions/plugins/sonarqube-community-branch-plugin-1.8.0.jar=ce
EOF

```



​	2. **安装中文插件**  

​	需要找到对应的版本，和我这个sonarqube对应的版本是v8.9,地址如下
​	[sonarqube中文插件v8.9](https://github.com/xuhuisheng/sonar-l10n-zh/releases/tag/sonar-l10n-zh-plugin-8.9)
​	然后挂载到对应的目录：**<font style="color:#DF2A3F;background-color:rgb(250, 250, 250);">/opt/sonarqube/sonarqube/extensions/plugins</font>**



3. **安装jdk**

   因为sonarqube的运行是需要借助于jdk的，所以需要安装一下jdk

   可以通过yum来安装jdk11,可以执行下面的命令来看你的yum中有什么版本的jdk

> yum list available | grep jdk
>



#### 六、使用流水线工程整合SonarQube


1. **打通jenkins和sonarqube**

   在sonarqube中创建token

![](https://s3.bmp.ovh/imgs/2025/11/19/fe9d306f00a7858a.png)

![](https://s3.bmp.ovh/imgs/2025/11/19/4a0461f6c0889594.png)

token: 01c6f6f9747e9e1c054e7465eee39926a888f054



2. **在jenkins的全局工具配置中配置sonarqube-scanner**

    2.1 

![](https://s3.bmp.ovh/imgs/2025/11/19/2de39b5d9fcb929d.png)



​		2.2 **配置系统管理**

![](https://s3.bmp.ovh/imgs/2025/11/19/c2adfc0522216259.png)



3. **修改Jenkinsfile文件，将sonarqube扫描加入到流水线**

```yaml
pipeline {
    agent any

    stages {
        stage('pull code') {
            steps {
                checkout scmGit(branches: [[name: '*/${branch}']], extensions: [], userRemoteConfigs: [[credentialsId: '06c6276d-4599-41df-a937-33aee5070ce4', url: 'http://192.168.20.106:82/carl/web-demo.git']])
            }
        }

        stage('build project') {
            steps {
                sh "mvn clean package"
            }
        }

        stage('sonarqube scanner') {
           steps{
            script{
            # tool name就是你在全局工具配置中配置的sonarqube scanner的名字
                    scannerName = tool name: 'sonar-scanner', type: 'hudson.plugins.sonar.SonarRunnerInstallation'
                   }
                   # 这里的名字就是你在系统管理中配置的sonarqube的名字
            withSonarQubeEnv('sonarqube8.9.0'){
                sh "${scannerName}/bin/sonar-scanner"
            }
           }
       }

        stage('publish project') {
            steps {
                echo 'publish project'
            }
        }
    }
    # post {
    #   always {
    #     emailext(
    #         subject: '构建通知：${PROJECT_NAME} - Build # ${BUILD_NUMBER} - ${BUILD_STATUS}!',
    #         body: '${FILE,path="email.html"}',
    #         to: 'xxxxx@163.com'
    #     )
    #   }
    # }
}

```



4. **在每一个项目中编写sonarqube扫描配置文件**

```properties
# must be unique in a given SonarQube instance
sonar.projectKey=web_demo
# this is the name and version displayed in the SonarQube UI. Was mandatory
prior to SonarQube 8.9.10.
sonar.projectName=web_demo
sonar.projectVersion=1.0
# Path is relative to the sonar-project.properties file. Replace "\" by "/" on
Windows.
# This property is optional if sonar.modules is set.
sonar.sources=.
sonar.exclusions=**/test/**,**/target/**
sonar.java.binaries=.
sonar.java.source=11.0.13
sonar.java.target=11.0.13
# Encoding of the source code. Default is default system encoding
sonar.sourceEncoding=UTF-8
```



> 补充：！！！！
>
> 注意：在sonarqube中我们要关闭提交SCM
>

![](https://s3.bmp.ovh/imgs/2025/11/19/93344a7a843d33e7.png)

​	

#### 七、拉取代码、编译、制作镜像、推送镜像流水线编写

​	下面是对应步骤的Jenkinsfile**<font style="color:#DF2A3F;">声明式</font>**流水线文件

```shell
pipeline {
    agent any
    environment {
       //前置的这个凭证需要你先在Jenkins的凭证中配置好
       gitlabCredential= "488c5ef3-cf9e-4f73-8a92-bafa24c00832"
       gitlabUrl = "http://192.168.20.106:82/root/mgs-platform.git"
       defaultVersion= "latest"
       harborUrl= "192.168.20.106:85"
       harborProject= "carl"
       harborCredential= "5cf917a1-cf05-469c-b888-cbaf00d20d7a"

    }
    stages {
        //阶段一
        stage('pull code') {
            steps {
                deleteDir()
                checkout scmGit(branches: [[name: '*/${branch}']], extensions: [], userRemoteConfigs: [[credentialsId: "${gitlabCredential}", url: "${gitlabUrl}"]])
            }
        }

        //阶段二
        stage('sonarqube scan code') {
            steps {
                script{
                  scannerName = tool name: 'sonar-scanner', type: 'hudson.plugins.sonar.SonarRunnerInstallation'
                }
                withSonarQubeEnv('sonarqube8.9.0') {
                  sh """
                     cd ${project_name}
                     ${scannerName}/bin/sonar-scanner
                     """
                }
            }
        }

        //阶段三
        stage('build code'){
          steps{
            sh """
               mvn clean install -DskipTests
               mvn -f ${project_name} clean package docker:build -DskipTests
               docker tag ${project_name}:${defaultVersion}  ${harborUrl}/${harborProject}/${project_name}:${defaultVersion}
               """
          }
        }

        //阶段四
        stage('docker push'){
            steps{
                withCredentials([usernamePassword(credentialsId: "${harborCredential}", passwordVariable: 'password', usernameVariable: 'username')]) {
                    sh "docker login -u ${username} -p ${password} ${harborUrl}"
                    sh "docker push ${harborUrl}/${harborProject}/${project_name}:${defaultVersion}"
                }
            }
        }
    }
}

```



#### 八、在Jenkinsfile中配置Publish Over SSH连接master并执行deploy.sh部署脚本

1. **配置ssh连接** 
    如果想要让Jenkins服务器可以通过ssh来连接k8s的master节点，那么需要在Jenkins服务器通过命令来生成一对密钥，然后将公钥发送给k8s的master节点。

  1.1 **生成密钥对**

> ssh-keygen -t rsa
>

​		1.2 **发送公钥给master机器**

> cd /root/..ssh
>
> ssh-copy-id 192.168.20.100
>



2. **在Jenkins中配置Publish Over SSH**

   ![](https://s3.bmp.ovh/imgs/2025/11/19/043ab616383544bb.png)



3. **在master节点编写部署脚本**

   我这个项目将部署脚本放在了master机器的/opt/jenkins_shell/下，叫做deploy.sh

```shell
#!/bin/sh
#接收外部参数
project_name=$1
branch=$2
version=$3
cd /opt/jenkins_shell
# 动态替换镜像 tag
sed -i "s|\(image: .*${project_name}:\).*|\1${version}|g" $project_name-$branch.yml
kubectl apply -f $project_name-$branch.yml
```

​	说明：Jenkins来触发的时候需要传递两个参数，一个是项目名称，另一个是分支，最后通过这个deploy.sh去执行的yaml格式是：

​	kubectl apply -f msg-gateway-master.yml



> 注意：
>
> 你需要给这个部署sh脚本一个可执行权限
>
> chmod +x deploy.sh
>



4. **编写k8s对应的部署yaml**
    1. **msg-admin-master.yml**

```shell
apiVersion: apps/v1
kind: Deployment
metadata:
  name: msg-admin
  namespace: master
spec:
  replicas: 2
  selector:
    matchLabels:
      app: msg-admin
  template:
    metadata:
      labels:
        app: msg-admin
    spec:
      containers:
        - name: msg-admin
          image: 192.168.20.106:85/carl/msg-admin:latest
          imagePullPolicy: Always
          ports:
            - containerPort: 10011
      imagePullSecrets:
        - name: harbor-secret

---
apiVersion: v1
kind: Service
metadata:
  name: msg-admin
spec:
  selector:
    app: msg-admin
  ports:
    - port: 10011
      targetPort: 10011
```



​	2. **msg-gateway-master.yml**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: msg-gateway
  namespace: master
spec:
  replicas: 2
  selector:
    matchLabels:
      app: msg-gateway
  template:
    metadata:
      labels:
        app: msg-gateway
    spec:
      containers:
        - name: msg-gateway
          image: 192.168.20.106:85/carl/msg-gateway:latest
          imagePullPolicy: Always
          ports:
            - containerPort: 10010
      imagePullSecrets:
        - name: harbor-secret
---
apiVersion: v1
kind: Service
metadata:
  name: msg-gateway
spec:
  type: NodePort
  selector:
    app: msg-gateway
  ports:
    - port: 10010
      targetPort: 10010
      nodePort: 30010  # 你可以外部访问的端口

```



​	3. **msg-server-master.yml**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: msg-server
  namespace: master
spec:
  replicas: 2
  selector:
    matchLabels:
      app: msg-server
  template:
    metadata:
      labels:
        app: msg-server
    spec:
      containers:
        - name: msg-server
          image: 192.168.20.106:85/carl/msg-server:latest
          imagePullPolicy: Always
          ports:
            - containerPort: 10012
      imagePullSecrets:
        - name: harbor-secret     

---
apiVersion: v1
kind: Service
metadata:
  name: msg-server
spec:
  selector:
    app: msg-server
  ports:
    - port: 10012
      targetPort: 10012

```



​	4. **msg-api-master.yml**

```shell
apiVersion: apps/v1
kind: Deployment
metadata:
  name: msg-api
  namespace: master
spec:
  replicas: 2
  selector:
    matchLabels:
      app: msg-api
  template:
    metadata:
      labels:
        app: msg-api
    spec:
      containers:
        - name: msg-api
          image: 192.168.20.106:85/carl/msg-api:latest
          imagePullPolicy: Always
          ports:
            - containerPort: 10013
      imagePullSecrets:
        - name: harbor-secret
---
apiVersion: v1
kind: Service
metadata:
  name: msg-api
spec:
  selector:
    app: msg-api
  ports:
    - port: 10013
      targetPort: 10013

```



5. **配置密钥和命名空间**

   通过上面的yml文件，我们发现所有的镜像都是从私有仓库harbor进行拉取的，所以需要使用docker login登录harbor然后才可以进行拉取，所以需要在k8s中创建一个密钥来存放harbor的连接信息，然后在yaml配置文件中可以直接使用去拉取镜像了。

```shell
kubectl create secret docker-registry harbor-secret \
  --docker-server=192.168.20.106:85 \
  --docker-username=admin \
  --docker-password=password \
  -n master
```



​	本项目的规划是创建四个命名空间，所以对应的每一个服务就有四个yaml配置文件，四个命名空间分别是master、dev、test、prod

```shell
kubectl create namespace master
kubectl create namespace dev
kubectl create namespace test
kubectl create namespace prod
```



6. **编写Jenkinsfile代码**

```yaml
pipeline {
    agent any
    environment {
       gitlabCredential= "488c5ef3-cf9e-4f73-8a92-bafa24c00832"
       gitlabUrl = "http://192.168.20.106:82/root/mgs-platform.git"
       harborUrl= "192.168.20.106:85"
       harborProject= "carl"
       harborCredential= "5cf917a1-cf05-469c-b888-cbaf00d20d7a"

    }
    stages {
        //阶段一
        stage('pull code') {
            steps {
                deleteDir()
                checkout scmGit(branches: [[name: '*/${branch}']], extensions: [], userRemoteConfigs: [[credentialsId: "${gitlabCredential}", url: "${gitlabUrl}"]])
            }
        }

        //阶段二
        stage('sonarqube scan code') {
            steps {
                script{
                  def projectList="${project_name}".split(",")
                  scannerName = tool name: 'sonar-scanner', type: 'hudson.plugins.sonar.SonarRunnerInstallation'
                  withSonarQubeEnv('sonarqube8.9.0') {
                                    for(project in projectList){
                                      sh """
                                         cd ${project}
                                         ${scannerName}/bin/sonar-scanner
                                         """
                                    }
                                  }
                }
            }
        }

        //阶段三
        stage('build code'){

          steps{
            script{
                sh "mvn clean install -DskipTests"
                def projectList="${project_name}".split(",")
                for(project in projectList){
                    sh "mvn -f ${project} clean package docker:build -DskipTests -Ddocker.image.tag=${version}"
                    sh "docker tag ${project}:${version}  ${harborUrl}/${harborProject}/${project}:${version}"
                 }
            }
          }
        }

        //阶段四
        stage('docker push'){
            steps{
                script{
                withCredentials([usernamePassword(credentialsId: "${harborCredential}", passwordVariable: 'password', usernameVariable: 'username')]) {
                                                       sh "docker login -u ${username} -p ${password} ${harborUrl}"
                                                     }

                def projectList="${project_name}".split(",")
                for(project in projectList){
                    sh "docker push ${harborUrl}/${harborProject}/${project}:${version}"
//                     删除本地镜像
//                     sh "docker rmi ${project}:${version}"
//                     sh "docker rmi ${harborUrl}/${harborProject}/${project}:${version}"
                }
                }
            }
        }

        //阶段五
        stage('k8s publish'){
            steps{
              script{
                def projectList="${project_name}".split(",")
                for(project in projectList){
                sshPublisher(publishers: [sshPublisherDesc(configName: 'master', transfers: [sshTransfer(cleanRemote: false, excludes: '', execCommand: "/opt/jenkins_shell/deploy.sh ${project} ${branch} ${version}", execTimeout: 120000, flatten: false, makeEmptyDirs: false, noDefaultExcludes: false, patternSeparator: '[, ]+', remoteDirectory: '', remoteDirectorySDF: false, removePrefix: '', sourceFiles: '')], usePromotionTimestamp: false, useWorkspaceInPromotion: false, verbose: false)])
                }
              }
            }
        }
    }
}

```



#### 九、Jenkins部署vue前端项目流程

1. 在node1这个节点上安装nginx

    1.1 **下载**

> yum install epel-release
>
> yum -y install nginx
>

​	1.2. **修改配置**

> vi /etc/nginx/nginx.conf
>

```shell
server {
listen 9090 default_server;
listen [::]:9090 default_server;
server_name _;
root /usr/share/nginx/html;
```



​	1.3 **还需要关闭selinux**

​	将SELINUX=disabled

> #先临时关闭
>
> setenforce 0 
>
> vi /etc/selinux/config 编辑文件，永久关闭 SELINUX=disabled
>

​	启动Nginx



2. **编写Jenkinsfile流水线**

```shell
pipeline {
    agent any
    stages {
        stage('pull code') {
            steps {
                checkout scmGit(branches: [[name: '*/master']], extensions: [], userRemoteConfigs: [[credentialsId: '488c5ef3-cf9e-4f73-8a92-bafa24c00832', url: 'http://192.168.20.106:82/root/msg-platform-front.git']])
            }
        }
        
        stage('nodejs') {
            steps{
            sshPublisher(publishers: [sshPublisherDesc(configName: 'node1', transfers: [sshTransfer(cleanRemote: false, excludes: '', execCommand: '', execTimeout: 120000, flatten: false, makeEmptyDirs: false, noDefaultExcludes: false, patternSeparator: '[, ]+', remoteDirectory: '/usr/share/nginx/html', remoteDirectorySDF: false, removePrefix: 'dist', sourceFiles: 'dist/**')], usePromotionTimestamp: false, useWorkspaceInPromotion: false, verbose: false)])
            }
            }
    }
}

```



​	这里我是在本地build了前端项目，然后将dist文件夹直接传到了代码仓库然后直接通过publish over ssh发送给了nginx服务器



#### 十、Jenkins中配置一些工具以及变量信息整理

1. **Jenkins配置JDK环境**
![](https://s3.bmp.ovh/imgs/2025/11/19/f76de4f122927b20.png)



2. **Jenkins配置Maven环境**
![](https://s3.bmp.ovh/imgs/2025/11/19/162648d9ca8bde9d.png)



3. **Jenkins配置sonarqube**
![](https://s3.bmp.ovh/imgs/2025/11/19/b55a0d4c75a401e5.png)



4. **Jenkins配置Publish Over SSH**

![](https://s3.bmp.ovh/imgs/2025/11/19/043ab616383544bb.png)





#### 十一、补充

​	因为我得项目需要使用到Nacos以及MySQL，所以下面来记录一下Nacos和MySQL的部署

1. **nacos部署**

    1.1 **去github官方下载对应的tar包，上传到服务器然后解压**
    我使用的nacos的版本为v2.4.1，对应的地址如下：
    [nacos v2.4.1](https://github.com/alibaba/nacos/releases/tag/2.4.1)

    1.2 **修改配置文件，使用本地的MySQL来进行持久化**

需要在MySQL数据库中执行下面的SQL脚本进行表结构的初始化

```sql
/*
 * Copyright 1999-2018 Alibaba Group Holding Ltd.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/******************************************/
/*   表名称 = config_info                  */
/******************************************/
CREATE TABLE `config_info` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT COMMENT 'id',
  `data_id` varchar(255) NOT NULL COMMENT 'data_id',
  `group_id` varchar(128) DEFAULT NULL COMMENT 'group_id',
  `content` longtext NOT NULL COMMENT 'content',
  `md5` varchar(32) DEFAULT NULL COMMENT 'md5',
  `gmt_create` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `gmt_modified` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '修改时间',
  `src_user` text COMMENT 'source user',
  `src_ip` varchar(50) DEFAULT NULL COMMENT 'source ip',
  `app_name` varchar(128) DEFAULT NULL COMMENT 'app_name',
  `tenant_id` varchar(128) DEFAULT '' COMMENT '租户字段',
  `c_desc` varchar(256) DEFAULT NULL COMMENT 'configuration description',
  `c_use` varchar(64) DEFAULT NULL COMMENT 'configuration usage',
  `effect` varchar(64) DEFAULT NULL COMMENT '配置生效的描述',
  `type` varchar(64) DEFAULT NULL COMMENT '配置的类型',
  `c_schema` text COMMENT '配置的模式',
  `encrypted_data_key` varchar(1024) NOT NULL DEFAULT '' COMMENT '密钥',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_configinfo_datagrouptenant` (`data_id`,`group_id`,`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin COMMENT='config_info';

/******************************************/
/*   表名称 = config_info  since 2.5.0                */
/******************************************/
CREATE TABLE `config_info_gray` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT 'id',
  `data_id` varchar(255) NOT NULL COMMENT 'data_id',
  `group_id` varchar(128) NOT NULL COMMENT 'group_id',
  `content` longtext NOT NULL COMMENT 'content',
  `md5` varchar(32) DEFAULT NULL COMMENT 'md5',
                                    `src_user` text COMMENT 'src_user',
                                    `src_ip` varchar(100) DEFAULT NULL COMMENT 'src_ip',
                                    `gmt_create` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'gmt_create',
                                    `gmt_modified` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'gmt_modified',
                                    `app_name` varchar(128) DEFAULT NULL COMMENT 'app_name',
                                    `tenant_id` varchar(128) DEFAULT '' COMMENT 'tenant_id',
                                    `gray_name` varchar(128) NOT NULL COMMENT 'gray_name',
                                    `gray_rule` text NOT NULL COMMENT 'gray_rule',
                                    `encrypted_data_key` varchar(256) NOT NULL DEFAULT '' COMMENT 'encrypted_data_key',
                                    PRIMARY KEY (`id`),
                                    UNIQUE KEY `uk_configinfogray_datagrouptenantgray` (`data_id`,`group_id`,`tenant_id`,`gray_name`),
                                    KEY `idx_dataid_gmt_modified` (`data_id`,`gmt_modified`),
                                    KEY `idx_gmt_modified` (`gmt_modified`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8 COMMENT='config_info_gray';

/******************************************/
/*   表名称 = config_tags_relation         */
/******************************************/
CREATE TABLE `config_tags_relation` (
                                        `id` bigint(20) NOT NULL COMMENT 'id',
                                        `tag_name` varchar(128) NOT NULL COMMENT 'tag_name',
                                        `tag_type` varchar(64) DEFAULT NULL COMMENT 'tag_type',
                                        `data_id` varchar(255) NOT NULL COMMENT 'data_id',
                                        `group_id` varchar(128) NOT NULL COMMENT 'group_id',
                                        `tenant_id` varchar(128) DEFAULT '' COMMENT 'tenant_id',
                                        `nid` bigint(20) NOT NULL AUTO_INCREMENT COMMENT 'nid, 自增长标识',
                                        PRIMARY KEY (`nid`),
                                        UNIQUE KEY `uk_configtagrelation_configidtag` (`id`,`tag_name`,`tag_type`),
                                        KEY `idx_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin COMMENT='config_tag_relation';

/******************************************/
/*   表名称 = group_capacity               */
/******************************************/
CREATE TABLE `group_capacity` (
                                  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT COMMENT '主键ID',
                                  `group_id` varchar(128) NOT NULL DEFAULT '' COMMENT 'Group ID，空字符表示整个集群',
                                  `quota` int(10) unsigned NOT NULL DEFAULT '0' COMMENT '配额，0表示使用默认值',
                                  `usage` int(10) unsigned NOT NULL DEFAULT '0' COMMENT '使用量',
                                  `max_size` int(10) unsigned NOT NULL DEFAULT '0' COMMENT '单个配置大小上限，单位为字节，0表示使用默认值',
                                  `max_aggr_count` int(10) unsigned NOT NULL DEFAULT '0' COMMENT '聚合子配置最大个数，，0表示使用默认值',
                                  `max_aggr_size` int(10) unsigned NOT NULL DEFAULT '0' COMMENT '单个聚合数据的子配置大小上限，单位为字节，0表示使用默认值',
                                  `max_history_count` int(10) unsigned NOT NULL DEFAULT '0' COMMENT '最大变更历史数量',
                                  `gmt_create` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
                                  `gmt_modified` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '修改时间',
                                  PRIMARY KEY (`id`),
                                  UNIQUE KEY `uk_group_id` (`group_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin COMMENT='集群、各Group容量信息表';

/******************************************/
/*   表名称 = his_config_info              */
/******************************************/
CREATE TABLE `his_config_info` (
                                   `id` bigint(20) unsigned NOT NULL COMMENT 'id',
                                   `nid` bigint(20) unsigned NOT NULL AUTO_INCREMENT COMMENT 'nid, 自增标识',
                                   `data_id` varchar(255) NOT NULL COMMENT 'data_id',
                                   `group_id` varchar(128) NOT NULL COMMENT 'group_id',
                                   `app_name` varchar(128) DEFAULT NULL COMMENT 'app_name',
                                   `content` longtext NOT NULL COMMENT 'content',
                                   `md5` varchar(32) DEFAULT NULL COMMENT 'md5',
                                   `gmt_create` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
                                   `gmt_modified` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '修改时间',
                                   `src_user` text COMMENT 'source user',
                                   `src_ip` varchar(50) DEFAULT NULL COMMENT 'source ip',
                                   `op_type` char(10) DEFAULT NULL COMMENT 'operation type',
                                   `tenant_id` varchar(128) DEFAULT '' COMMENT '租户字段',
                                   `encrypted_data_key` varchar(1024) NOT NULL DEFAULT '' COMMENT '密钥',
                                   `publish_type` varchar(50)  DEFAULT 'formal' COMMENT 'publish type gray or formal',
                                   `gray_name` varchar(50)  DEFAULT NULL COMMENT 'gray name',
                                   `ext_info`  longtext DEFAULT NULL COMMENT 'ext info',
                                   PRIMARY KEY (`nid`),
                                   KEY `idx_gmt_create` (`gmt_create`),
                                   KEY `idx_gmt_modified` (`gmt_modified`),
                                   KEY `idx_did` (`data_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin COMMENT='多租户改造';


/******************************************/
/*   表名称 = tenant_capacity              */
/******************************************/
CREATE TABLE `tenant_capacity` (
                                   `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT COMMENT '主键ID',
                                   `tenant_id` varchar(128) NOT NULL DEFAULT '' COMMENT 'Tenant ID',
                                   `quota` int(10) unsigned NOT NULL DEFAULT '0' COMMENT '配额，0表示使用默认值',
                                   `usage` int(10) unsigned NOT NULL DEFAULT '0' COMMENT '使用量',
                                   `max_size` int(10) unsigned NOT NULL DEFAULT '0' COMMENT '单个配置大小上限，单位为字节，0表示使用默认值',
                                   `max_aggr_count` int(10) unsigned NOT NULL DEFAULT '0' COMMENT '聚合子配置最大个数',
                                   `max_aggr_size` int(10) unsigned NOT NULL DEFAULT '0' COMMENT '单个聚合数据的子配置大小上限，单位为字节，0表示使用默认值',
                                   `max_history_count` int(10) unsigned NOT NULL DEFAULT '0' COMMENT '最大变更历史数量',
                                   `gmt_create` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
                                   `gmt_modified` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '修改时间',
                                   PRIMARY KEY (`id`),
                                   UNIQUE KEY `uk_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin COMMENT='租户容量信息表';


CREATE TABLE `tenant_info` (
                               `id` bigint(20) NOT NULL AUTO_INCREMENT COMMENT 'id',
                               `kp` varchar(128) NOT NULL COMMENT 'kp',
                               `tenant_id` varchar(128) default '' COMMENT 'tenant_id',
                               `tenant_name` varchar(128) default '' COMMENT 'tenant_name',
                               `tenant_desc` varchar(256) DEFAULT NULL COMMENT 'tenant_desc',
                               `create_source` varchar(32) DEFAULT NULL COMMENT 'create_source',
                               `gmt_create` bigint(20) NOT NULL COMMENT '创建时间',
                               `gmt_modified` bigint(20) NOT NULL COMMENT '修改时间',
                               PRIMARY KEY (`id`),
                               UNIQUE KEY `uk_tenant_info_kptenantid` (`kp`,`tenant_id`),
                               KEY `idx_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin COMMENT='tenant_info';

CREATE TABLE `users` (
                         `username` varchar(50) NOT NULL PRIMARY KEY COMMENT 'username',
                         `password` varchar(500) NOT NULL COMMENT 'password',
                         `enabled` boolean NOT NULL COMMENT 'enabled'
);

CREATE TABLE `roles` (
                         `username` varchar(50) NOT NULL COMMENT 'username',
                         `role` varchar(50) NOT NULL COMMENT 'role',
                         UNIQUE INDEX `idx_user_role` (`username` ASC, `role` ASC) USING BTREE
);

CREATE TABLE `permissions` (
                               `role` varchar(50) NOT NULL COMMENT 'role',
                               `resource` varchar(128) NOT NULL COMMENT 'resource',
                               `action` varchar(8) NOT NULL COMMENT 'action',
                               UNIQUE INDEX `uk_role_permission` (`role`,`resource`,`action`) USING BTREE
);
```



2. **部署MySQL**
    这里使用docker来部署一个单机的MySQL作为演示

  2.1 **创建挂载目录**

```shell
mkdir -p  /home/mysql/{conf,data,log}

```



​		2.2 **使用docker启动**

```shell
docker run \
-p 3306:3306 \
--restart=always \
--name mysql \
--privileged=true \
-v /home/mysql/log:/var/log/mysql \
-v /home/mysql/data:/var/lib/mysql \
-v /home/mysql/conf/my.cnf:/etc/mysql/my.cnf \
-e MYSQL_ROOT_PASSWORD=123456 \
-d mysql:5.7
```





3. **Jenkins中有流水线生成提示
**![](https://s3.bmp.ovh/imgs/2025/11/19/a2ec6cf6328238cd.png)
4. 可以实现将jenkins执行的结果通过邮件发送

    4.1 **安装插件**
    Email Extension  

    4.2 **Jenkins设置邮箱相关**
    **![](https://s3.bmp.ovh/imgs/2025/11/19/b3d39444922c6397.png)**  

**![](https://s3.bmp.ovh/imgs/2025/11/19/21eba3c9cb8c6570.png)**  

​    4.3 **准备邮件内容**
​	在项目根目录编写email.html，并把文件推送到Gitlab，内容如下

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${ENV, var="JOB_NAME"}-第${BUILD_NUMBER}次构建日志</title>
</head>
<body leftmargin="8" marginwidth="0" topmargin="8" marginheight="4"
      offset="0">
<table width="95%" cellpadding="0" cellspacing="0"
       style="font-size: 11pt; font-family: Tahoma, Arial, Helvetica, sansserif">
    <tr>
        <td>(本邮件是程序自动下发的，请勿回复！)</td>
    </tr>
    <tr>
        <td><h2>
            <font color="#0000FF">构建结果 - ${BUILD_STATUS}</font>
        </h2></td>
    </tr>
    <tr>
        <td><br/>
            <b><font color="#0B610B">构建信息</font></b>
            <hr size="2" width="100%" align="center"/>
        </td>
    </tr>
    <tr>
        <td>
            <ul>
                <li>项目名称&nbsp;：&nbsp;${PROJECT_NAME}</li>
                <li>构建编号&nbsp;：&nbsp;第${BUILD_NUMBER}次构建</li>
                <li>触发原因：&nbsp;${CAUSE}</li>
                <li>构建日志：&nbsp;<a
                        href="${BUILD_URL}console">${BUILD_URL}console</a></li>
                <li>构建&nbsp;&nbsp;Url&nbsp;：&nbsp;<a
                        href="${BUILD_URL}">${BUILD_URL}</a></li>
                <li>工作目录&nbsp;：&nbsp;<a
                        href="${PROJECT_URL}ws">${PROJECT_URL}ws</a></li>
                <li>项目&nbsp;&nbsp;Url&nbsp;：&nbsp;<a
                        href="${PROJECT_URL}">${PROJECT_URL}</a></li>
            </ul>
        </td>
    </tr>
    <tr>
        <td><b><font color="#0B610B">Changes Since Last
            Successful Build:</font></b>
            <hr size="2" width="100%" align="center"/>
        </td>
    </tr>
    编写Jenkinsfile添加构建后发送邮件
    <tr>
        <td>
            <ul>
                <li>历史变更记录 : <a
                        href="${PROJECT_URL}changes">${PROJECT_URL}changes</a></li>
            </ul>
            ${CHANGES_SINCE_LAST_SUCCESS,reverse=true, format="Changes for Build #%n:<br/>%c<br/>",showPaths=true,changesFormat="<pre>[%a]<br/>%m</pre>"}
        </td>
    </tr>
    <tr>
        <td><b>Failed Test Results</b>
            <hr size="2" width="100%" align="center"/>
        </td>
    </tr>
    <tr>
        <td><pre
                style="font-size: 11pt; font-family: Tahoma, Arial, Helvetica,
sans-serif">${FAILED_TESTS}</pre>
            <br/></td>
    </tr>
    <tr>
        <td><b><font color="#0B610B">构建日志 (最后 100行):</font></b>
            <hr size="2" width="100%" align="center"/>
        </td>
    </tr>
    <tr>
        <td><textarea cols="80" rows="30" readonly="readonly"
                      style="font-family: Courier New">${BUILD_LOG,maxLines=100}</textarea>
        </td>
    </tr>
</table>
</body>
</html>
```



centos7中搜索目录的命令

```bash
find / -path "*/filename*"
```





邮箱授权码

efwvvempkglygcjg



#### 十二、**优化点**

目前这个项目已经可以完成一个基本的微服务的CI/CD流程了。但是依然有一些可以优化的点，可以在这里做一个记录，方便以后进行优化的时候进行查询。

    - [ ] 单master的k8s集群可以扩展成多master的集群
    - [ ] k8s实现金丝雀发布
    - [ ] k8s使用Ingress Nginx实现通过域名访问k8s集群
    - [ ] Nacos可以变成集群环境搭建
    - [ ] MySQL由单机部署变成分布式一主多从的部署架构
    - [ ] 单节点Jenkins可以变成通过k8s来搭建Jenkins的主从架构
    - [ ] 在Jenkins上配置NodeJS来编译前端项目





