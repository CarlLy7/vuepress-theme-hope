---
title: JVM通用业务参数模板与调优
date: 2025-07-09
icon: chess-queen
---



## JVM通用业务参数模板与调优

#### 一、响应优先的业务系统

对于响应优先的业务系统，核心的关键就是希望系统有更少的STW(Stop The World)时间，所以下面以4c8g的服务器作为例子来写，通用的一个JVM参数

```shell
# 堆内存最小大小
-Xms4g
# 堆内存最大大小
-Xmx4g
# 新生代内存大小
-Xmn2g
# 栈内存大小
-Xss1m
# 新生代中Eden区和幸存者区的比例
-XX:SurvivorRatio=8
# 新生代进入老年代的年龄阈值
-XX:MaxTenuringThreshold=10
# 使用CMS垃圾收集器
-XX:+UseConcMarkSweepGC
# 当内存占用率达到70%的时候触发fullgc
-XX:CMSInitiatingOccupancyFraction=70
# 每次内存占用率达到70%的时候都会触发fullgc
-XX:+UseCMSInitiatingOccupancyOnly
# 强制操作系统把内存真正分配给JVM，而不是用时才分配
-XX:+AlwaysPreTouch
# 当JVM发生OOM的时候打印Heap Dump文件
-XX:+HeapDumpOnOutOfMemoryError
-verbose:gc
# 开启GC日志
-XX:+PrintGCDetails
# 打印GC日志的日期戳
-XX:+PrintGCDateStamps
# 打印GC日志的时间戳
-XX:+PrintGCTimeStamps
# GC日志输出
-Xloggc:gc.log
```



> 补充：
>
> 对于一般的业务系统来说，JVM内存大小其实分配机器内存的一半就够了。
>
> 对于响应优先的业务系统，我们的JVM内存不要分配的过大，大的内存确实可以减少GC的次数，可能会在前期带来比较好的响应时间，但是如果随着系统上线的时间越来越长，可能会导致GC，而过大的内存在进行full gc的时候，会占用大量的时间，响应会变慢。



#### 二、吞吐量优先的业务系统

对于吞吐量优先的业务系统，核心的关键是希望系统有更大的吞吐量，下面以一个8c16g的服务器为例

```shell
# 堆内存初始大小
-Xms8g
# 堆内存最大大小
-Xmx8g
# 栈内存大小
-Xss1m
# 使用G1垃圾收集器
-XX:+UseG1GC
# 最大GC停顿时间
-XX:MaxGCPauseMillis=150
# 当整个堆的空间使用百分比超过这个值时，就会融发MixGC
-XX:InitiatingHeapOccupancyPercent=40
# 当JVM发生OOM的时候打印Heap Dump文件
-XX:+HeapDumpOnOutOfMemoryError
-verbose:gc
# 开启GC日志
-XX:+PrintGCDetails
# 打印GC日志的日期戳
-XX:+PrintGCDateStamps
# 打印GC日志的时间戳
-XX:+PrintGCTimeStamps
-Xloggc:gc.log
```





#### 技巧：

对于JVM参数的设置其实最核心的就是**预估**和**分配**。应该在系统上线之前，通过压测等手段来预估一下系统的QPS，然后根据这个QPS再来预估一下每秒会产生多大的对象，然后根据这个来进行内存的预估和分配。

对于JVM内存比较大的系统，官方比较推荐的是G1垃圾收集器，所以我们可以使用默认的G1垃圾收集器。

对于比如：**进入老年代的年龄阈值**这种参数，其实我们是需要根据具体的系统来进行调整的，上面只是给出一个参考，比如我们希望让短命的对象在MinorGC阶段就被回收，长命对象我们希望尽快的进入老年代，不要频繁的在幸存者区来回复制，那么我们就可以将这个年龄阈值变小。



