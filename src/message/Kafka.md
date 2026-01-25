---
title: Kafka
date: 2023-12-01 16:44:48
order: 4
icon: uis:clock-nine
---





## Kafka



#### Kafka中的重要概念



- producer：生产者，发送消息的一方
- consumer:消费者，消费消息的一方，一个consumer在一同一个topic下只会消费一个partition
- topic:主题，Kafka的消息队列是发布订阅模式，producer将消息发送到topic中，consumer来订阅topic
- broker:代理，可以简单的理解为Kafka实例，多个broker可以组成一个cluster
- partition:分区，可以理解为消息队列中的队列，是属于topic的



**注意：topic可以跨broker，所有partition也可以跨broker**



#### Kafka的多副本机制

Kafka中有多副本机制，每个partition中有一个leader和多个follower,其中follower数量可以自己指定。Kafka中消息的读写操作都是直接和leader来进行交互的，而follower负责拉取leader中的数据来进行同步，一旦leader发生故障宕机了，那么会从所有的follower中快速的选择一个来作为leader。



好处：

1. 一个topic可以有多个partition，而这些partition又可以分配到不同的broker上，这样可以提供更好的并发性，还可以负载均衡
2. 提高了容灾能力，leader的宕机不会导致整个partition不可用



#### Kafka中broker之间的副本机制

之前提高到了，一个broker就是一个Kafka实例，多个broker可以组成cluster，那么多个broker之间也可以存在副本机制，既leader和follower,这样可以提高容灾能力，当一个broker不可用的时候，数据不会丢失。

Kafka中broker之间的副本机制主要是通过producer的acks来决定的，不同的acks等级有不同的严格程度

1. acks=0

   如果producer设置的acks=0的话，producer只管发送消息，不管是否保存，性能最好但是可靠性最差



2. acks=1

   producer给leader的broker发送消息后，需要等待leader返回ack后才会继续发送



3. acks=-1

   producer给leader的broker发送消息后，需要等待所有broker副本完成数据同步后才会进行下一个发送。可靠性最强





#### Kafka中消息的顺序消费

我们知道Kafka中的消息实际是存放在partition中的，而partiton又是依赖于topic的，而一个topic中会有多个partition，那么我们发送的消息是如何保证消费顺序的呢。这里先顺便说一下，Kafka在向partition中存放消息的时候，会进行尾插法，将最新的数据放到最后，这是通过offset来保证的。

1. 最简单的方法就是一个topic只对应一个partition，这样就可以保证消息消费的顺序性，但是并发性大大下降，违背了Kafka的设计初衷，不推荐使用
2. 在Kafka中发送消息的时候，可以指定topic、partition、key、data，同一个key中的数据会放到同一个partition中，所以我们可以在发送消息的时候来指定partition/key来保证消息到一个partition中，只要在同一个partition中那么就可以保证顺序消费了。







#### Kafka中的Rebalance

概念

Kafka中的Rebalance称之为再均衡。是Kafka确保Consumer Group下所有的consumer如何达成一致，分配订阅topic下的每个分区的机制。



会触发Rebalance的几种情况

1. consumer group中的consumer实例改变
2. 订阅的topic发生了变化，比如本来一个consumer group订阅了三个topic,突然有一个topic下线了，就会触发rebalance
3. topic中的分区改变



rebalance的缺点

consumer group中的consumer在进行rebalance的时候，整个服务是不可用的。



#### AR、ISR、OSR的概念

- AR

  分区的所有副本叫做AR

- ISR

  与leader保持一定同步程度的副本叫做ISR

- OSR

  由于follower副本同步滞后过多的副本叫做OSR



AR=ISR+OSR

但是一般AR=ISR,OSR为空



#### leader的选举

Kafka中leader宕机之后需要立刻从follower中选举出新的leader,这个选举过程不是zookeeper那样的选举，而是比zookeeper的选举快的多。因为Kafka是用来处理大数据量的，如果选举太慢的话会严重影响性能和业务。如果Kafka业务量大的话会有多个partition，一旦一个broker宕机的话会触发多个partition的leader选举。如果使用zookeeper的选举方式的话肯定很慢了。



Kafka中的leader的选举其实是通过controller来进行的。controller是针对broker的，每一个broker创建的时候都会去zookeeper中申请成为controller，但是只有一个broker会成为controller。

Kafka中的topic的创建、添加分区、修改副本数量等操作都是由这个controller来完成的。

而controller也是高可用的，一旦这个controller宕机了，会从其他的broker中快速选举一个controller



##### controller选举leader的过程

当leader宕机之后，controller回去对应的partition的ISR中随机选择一个副本作为leader,如果ISR中没有副本了，则会在所有的副本中随机选择一个副本作为leader，如果这个partition一个副本都没有了，那么leader设置为-1



#### Kafka的数据存储形式

一个topic中有多个partition，一个partition中有多个segment，一个segment中有多个文件（log,index,timeIndex）

![kafka中数据存储形式.png](https://cdn.jsdelivr.net/gh/EyeDroplyq/myblog-img@master/kafka中数据存储形式.png)

| 文件名                         | 说明                                                   |
| ------------------------------ | ------------------------------------------------------ |
| 00000000000000000000.index     | 索引文件，根据offset查找数据就是通过该索引文件来操作的 |
| 00000000000000000000.log       | 日志数据文件,里面存放的其实是实际的数据                |
| 00000000000000000000.timeindex | 时间索引                                               |
| leader-epoch-checkpoint        | 日志文件中下一条待写入消息的offset                     |

- 每个日志文件的文件名为起始偏移量，因为每个分区的起始偏移量是0，所以，分区的日志文件都以0000000000000000000.log开始

- 默认的每个日志文件最大为「log.segment.bytes =1024*1024*1024」1G

- 为了简化根据offset查找消息，Kafka日志文件名设计为开始的偏移量



#### Kafka中数据的读取过程

​	注意：Kafka中的数据的读取采用的是拉的模式，主动去拉取数据

1. 首先根据全局的offset去查找对应的segment端
2. 根据查找到的segment端找到对应文件的segment端的offset
3. 根据segment端的offset来读取数据
4. 为了提高查询效率，每个文件都会维护对应的范围内存，查找的时候就是使用简单的二分查找



#### Kafka中数据的写入过程

1. 去zookeeper中找对对应partition的leader位置
2. 发送消息给leader
3. leader将消息写入日志文件中
4. follower拉取leader中的消息并且写入自己的日志文件中
5. leader给producer返回ack



#### Kafka生产者写入数据的策略

1. 轮询分区策略

   轮流给各个分区中写入数据

2. 随机分区策略

   随机给各个分区中写入数据

3. 指定key分区策略

   按照key给各个分区写入数据，同一个key会分配到同一个分区

4. 自定义分区策略

   自定义写入分区的规则



#### Kafka中的日志删除

我们不可能让所有的日志一直保存，那样的话我们没有那么大的磁盘空间，所以我们需要对日志进行清楚，所以就有了Kafka中的日志清除

Kafka中的日志清除一共有三种策略：

1. 基于时间的保留策略

   我们可以设置日志的保留时间长短，超过这个时间之后就会标记为可删除

   

2. 基于日志大小的保留策略

   可以设置我们保留的日志的最大大小，超过这个大小之后就会标记为可删除



3. 基于日志起始偏移量的保留策略

   每个segment日志都有它的起始偏移量，如果起始偏移量小于logStartOffset，那么这些日志文件就会被标记为可删除



Kafka中有一个线程会定期去扫描所有被标记为可删除的文件，然后去执行真正的删除





#### Kafka如何保证消息不丢失的

Kafka保证消息不丢失主要是从两个方面来保证的，一方面是从生产者方面来保证消息不丢失，另一方面是从消费者方面来保证消息不丢失



- 生产者保证消息不丢失

  producer发送了消息之后我们不知道是不是真正的发送成功了，我们可以使用get()方法来判断是不是能拿到我们发送的数据，如何可以拿到的话说明这个消息发送成功了，反之说明消息发送失败，就需要进行重试。但是producer的send是异步操作，而get是同步操作，所以不推荐这样做。而是推荐使用回调函数，如果没有异常说明发送成功，如果有异常的话，处理异常之后重新发送

  producer的acks设置为acks=-1/acks=all

  设置 replication.factor >= 3，保证每一个leader至少有三个follower

  设置 min.insync.replicas> 1，保证至少被两个副本写入之后才算是发送成功。

  但是要注意replication.factor>min.insync.replicas,不然的话只要有一个副本没有写入，整个服务就不可用了，一般的设置是replication.factor=min.insync.replicas+1

  

重试机制：我们一般需要给producer设置一个retry次数，还需要给producer设置重试间隔时间，因为如果间隔太短的话，因为网络抖动可能都会立刻失败，所以适当提高重试间隔时间。



- 消费者保证消息不丢失	

  当消费者消费partition中的消息之后会自动提交对应的offset，但是这个自动提交会导致消息丢失，比如我们还没有处理完真正的业务逻辑的时候宕机了，实际这条消息没有处理，但是已经自动提交了，所以这个消息就丢失了。解决办法就是取消自动提交offset，采用手动提交offset，但是对应的问题就是可能会导致消息的重复消费，比如我们已经处理完成业务逻辑了，但是还没有手动提交offset的时候宕机了，下次重启之后依然会去消费这个消息，但是实际上已经消费过了。

  解决方案：

  1. 我们可以使用事务，比如我们进行实际业务处理的时候会使用MySQL，那么我们就可以将业务逻辑和提交offset放到一个事务中，这样就既不会丢失，又不会重复消费了。

  2. 做消息消费的幂等性处理，比如使用redis的set操作，或者mysql中的主键等天然幂等功能。



如果一个消息在规定的重试次数和重试间隔后依然不能被正常的消费的话，那么就把它丢到死信队列中进行进一步的处理，这样也不会将消息丢弃。



#### 消息积压

如果我们生产者生产的消息不能及时的被消费者消费的话就会造成Kafka中的消息积压，就会导致实时性下降



一般会导致数据积压的几种情况：

1. 消费者消费的业务出错，比如消费者消费这个消息的时候进行的业务是需要进行mysql操作的，结果mysql报错了，那么就无法消费消息了，导致消息积压
2. 网络抖动，比如我们设置的消费者的消费超时时间为50ms,但是因为网络抖动导致在这个时间内一直无法消费，所以导致了消息积压，如果想要解决可以适当的调大超时时间



我们的系统必须要保证消费端的性能高于生产端才可以保证系统正常的运行，如果消费端的性能低于生产端的性能，那么久而久之必然会造成消息积压

如果因为消费端造成了消息的积压的话，我们一般可以增加消费者实例，但是同时要增加对应的partition，因为一个消费者只能去消费一个对应的partition，如果我们只增加了实例而没有增加partition的话，其实相当于没有增加实例，没用。

此时，我们要使用监控系统来实时监控生产端和消费端的速率，如果出现问题能够快速发现和定位。





#### Kafka配额限速机制

如果生产者和消费者都大量的生产和消费消息，可能会占用broker上的所有的网络IO，可能会导致个别业务压爆服务器。为了防止这个问题的出现，Kafka可以进行配额限速，对生产者和消费者的produce&fetch操作进行流量限制。





END....

