---
title: 高性能无锁队列Disruptor
date: 2026-01-12 22:00:12
order: 3
icon: material-symbols:drafts
---





## Disruptor



### 一、概念

​	Disruptor是**建立在JVM平台上**的，也就是使用Java开发的。它的所有**数据运行在内存中**，使用**事件源驱动**方式，而且它是**无锁**的，所以这就决定了它的性能很好，有很低的延迟性。其中如果使用一句话来总结也很简单就是：

> Disruptor是一个运行在内存中的支持高并发的无锁队列

​	Disruptor使用了**观察者模式**（也可以理解为：发布-订阅模式），它**不会清空内存缓存中的数据而是进行数据的覆盖**，所以它**可以降低GC的频率**，只要我们设置了合理的缓冲区的大小，那么就不用过分担心大量的数据到达导致**OOM**，因为它会进行数据的覆盖。

​	Disruptor的上面的这些特性让它大量用在**即时零售行业**的程序中，比如金融交易系统的**撮合引擎**等。我github上的另一个虚拟货币交易系统中的撮合引擎就是使用了Disruptor来支持高并发的。



> Disruptor官网的Get-Started写的很好，推荐阅读一下，地址如下：https://lmax-exchange.github.io/disruptor/user-guide/index.html#_getting_started



### 二、Disruptor核心—RingBuffer

​	概念：**环形缓冲区**：环形缓冲区通常被认为是Disruptor的主要部分。然而，从3.0版本开始，环形缓冲区**仅负责存储和更新通过Disruptor移动的数据（事件）**。对于某些高级用例，它甚至可以被用户完全替换。

​	RingBuffer是一个**首尾相连的环形数组**，Disruptor中的数据（事件）会通过**序号**放在这个环形数组中，但是对于一个环形数组来说肯定是有大小的限制的，那么当Disruptor接收到的数据量超过了RingBuffer的大小之后怎么办呢？

​	**当序号超过数组大小之后，会对数组的大小进行取余操作**，取余之后得到的索引就是要放入的数组位置。但是我们知道**%这个运算的效率其实是很低的**，而且**可以用&运算进行替代%运算**，**%运算=序号&（数组大小-1）**，所以这就决定了我们在设计**数组大小**的时候**必须满足数组的大小是2的幂次方**。

​	而且由于RingBuffer是一个环形数组，所以通过它的大小会在**程序初始化的时候就分配好数组对应的内存空间**，可以提高性能。



![RingBuffer](https://s3.bmp.ovh/imgs/2026/01/11/3fd6b4724acce424.png)



### 三、Disruptor核心—Sequence、Sequencer、Sequence Barrier

#### 1. Sequence

​	Disruptor使用Sequence来识别当前处理的元素，可以理解为元素的序号、唯一标识。**消费者和Disruptor本身都维护一个Sequence**。

​	大部分的并发代码都是依赖于这些序列值的移动，所以序列支持AtmoicLong的许多特性，Sequence唯一的区别是**序列包含额外的功能来防止序列和其他值之间的虚假共享**



#### 2. Sequencer

​	Sequencer是序列的生产者，其实可以理解为Disruptor中的生产者，因为只有生产数据的时候才会真正的产生序列号。Disruptor中**最核心的部分其实就是Sequencer的实现**。在Disruptor中Sequencer有两种实现，一种是**单生产者**single producer,另一种是**多生产者**multi producer。

​	**Single producer VS Multi producer**

​	在并发系统中，提高性能的最好的方法之一是：**遵循单一写入原则！！！**。这个原则也适用于Disruptor,所以在Disruptor中**单生产者的性能是远远高于多生产者**的，所以在真实的**生产环境**中，**！！！强烈推荐**：**使用单生产者（Signle Producer)** 。

​	但是也要**注意！！！不要在多线程往RingBuffer中放数据的时候使用Single Producer**。

> 如果你的系统设计的是多个序号生产者在生产序号，那么你就不能使用Single Producer因为这样会导致序号混乱。

​	

​	在单生产者Single Producer的源码中，获取next序号的方法中，第一行就进行了线程的判断

```java
assert sameThread() : "Accessed by two threads - use ProducerType.MULTI!";

//下面是sameThread()方法的源码
private boolean sameThread()
    {
        return ProducerThreadAssertion.isSameThreadProducingTo(this);
    }
//底层其实是使用了一个Map来存储Single Producer和线程之间的关系
//Map<SingleProducerSequencer, Thread> PRODUCERS = new HashMap<>();
```



​	下面是Disruptor官方给出的一个**性能对比图**

|       | Signgle Producer             | Multi Producer               |
| ----- | ---------------------------- | ---------------------------- |
| Run 0 | Disruptor=89,365,504 ops/sec | Disruptor=26,553,372 ops/sec |
| Run 1 | Disruptor=77,579,519 ops/sec | Disruptor=28,727,377 ops/sec |
| Run 2 | Disruptor=78,678,206 ops/sec | Disruptor=29,806,259 ops/sec |
| Run 3 | Disruptor=80,840,743 ops/sec | Disruptor=29,717,682 ops/sec |
| Run 4 | Disruptor=81,037,277 ops/sec | Disruptor=28,818,443 ops/sec |
| Run 5 | Disruptor=81,168,831 ops/sec | Disruptor=29,103,608 ops/sec |
| Run 6 | Disruptor=81,699,346 ops/sec | Disruptor=29,239,766 ops/sec |

#### 3. Sequence Barrier

​	Sequence Barrier是序号屏障。也是Disruptor中的核心之一，负责**协调生产者—消费者之间、消费者—消费者之间的处理进度的“屏障”角色**。

​	每个消费者都有一个与之关联的Sequence Barrier。这个Sequence Barrier负责：

1. **等待可用的序号**
 消费者在处理下一个序号之前，**必须通过waitFor()方法等待**，等待**生产者已经发布并且确实该是自己处理**的序号。
2. **等待策略**
 因为消费者要通过Sequence Barrier来等待接收自己要处理的序号，所以**Sequence Barrier中有多种等待策略**，要根据不同的场景来选择消费者的等待策略
3. **实现多消费者不重复消费**
 多消费者还可以通过Sequence Barrier来实现对同一个序号不会进行重复消费



​	我补充一个从官网拿到的一个Disruptor的原理**流程图**

![Disruptor流程图](https://s3.bmp.ovh/imgs/2026/01/11/e692f158895c6b47.png)



### 四、Disruptor核心—等待策略



#### 1. BlockingWaitStrategy

​	这个等待策略是Disruptor中默认的等待策略，但是要注意，**这个等待策略使用了典型的锁和条件变量来处理线程唤醒**，所以如果使用这个等待策略，性能会降低，这个等待策略也是所有等待策略中**最慢**的,但是好处就是在CPU使用方面最保守，不会一直占着CPU。

​	适用场景：**<font color=red>不适合低延迟系统</font>**



#### 2. **SleepingWaitStrategy**

​	这个等待策略使用了**忙循环等待**的方式来等待新的事件到达。它与BlockWaitStrategy的区别是它在每次等待循环之间会调用一个方法，**LockSupport.parkNanos(1)**，这个方法在典型的Linux系统中，会让线程等待大约 60µs。

​	适用场景：**<font color=red>不适合低延迟系统</font>**，但是对生产线程的影响很小，所以一般适合用于**异步日志处理**场景。



#### 3. **YieldingWaitStrategy**（让步等待策略）

​	让步等待策略可以用于低延迟系统中，让步等待策略是使用**自旋**和**忙等待**来实现的，并且在等待的时候使用了**Thread.yield()**方法，**允许其他排队的线程运行**。

​	但是使用让步等待策略的时候需要注意，**<font color=red>EventHandler的数量不要超过CPU的逻辑核心数量</font>**。

​	注意：如果你的系统不是一个低延迟的系统，如果你**使用让步等待策略的话，那么会导致你的服务器的CPU一直维持在很高的水平**，可能会影响到你的服务的运行。所以让步等待策略就**适合整个服务器就只负责处理低延迟的数据**，那么你可以买个好点的服务器然后使用让步等待策略。



#### 4. **BusySpinWaitStrategy** 

​	BusySpinWaitStrategy是性能最高的等待策略，但是使用它有一个**硬性要求**：**<font color=red>EventHandler的数量不能超过CPU物理核心数量</font>**。

​	注意：如果你的系统不是一个低延迟的系统，如果你**使用BusySpinWaitStrategy等待策略的话，那么会导致你的服务器的CPU一直维持在很高的水平**，可能会影响到你的服务的运行。所以让步等待策略就**适合整个服务器就只负责处理低延迟的数据**，那么你可以买个好点的服务器然后使用BusySpinWaitStrategy等待策略。



### 五、Disruptor开发模型

​	因为Disruptor本质就是一个支持高并发的无锁内存队列，所以它的**使用并不复杂**，可以通过我总结的这个开发模型，按照这个模型一步步的开发就可以了。

#### 1. 定义Event

​	前面也说了Disruptor是使用了观察者模式（发布-订阅模式）所以在数据流转的过程中都是通过**事件发布**的方式来实现的。所以我们需要定义一个Event,将我们的实体对象进行抽象，抽象成一个事件。

```java
package com.carl.demo;

/**
 * @description:
 * @author: carl
 * @date: 2026.01.12
 * @Since: 1.0
 */
public class LongEvent {
    private long timeStamp;
    private Object source;

    public LongEvent(Object source) {
        this.source = source;
        this.timeStamp = System.currentTimeMillis();
    }

    public LongEvent() {
        this.timeStamp = System.currentTimeMillis();
    }

    public Object getSource() {
        return source;
    }

    public long getTimeStamp() {
        return timeStamp;
    }

    public void setTimeStamp(long timeStamp) {
        this.timeStamp = timeStamp;
    }

    public void setSource(Object source) {
        this.source = source;
    }

    @Override
    public String toString() {
        return "LongEvent{" +
               "timeStamp=" + timeStamp +
               ", source=" + source +
               '}';
    }
}

```





#### 2.定义事件工厂

​	自定义事件工厂，这个事件工厂负责产生我们上面第一步定义的事件Event。自定义事件工厂**需要实现EventFactory<?>**接口。

```java
package com.carl.demo;

import com.lmax.disruptor.EventFactory;

/**
 * @description:
 * @author: carl
 * @date: 2026.01.12
 * @Since: 1.0
 */

public class LongEventFactory implements EventFactory<LongEvent> {
    @Override
    public LongEvent newInstance() {
        return new LongEvent();
    }
}

```





#### 3. 定义事件消费者处理器

​	事件消费者处理器可以理解为事件的处理器，定义事件处理器**需要实现EventHandler<?>接口**。会消费处理从RingBuffer中拿到的事件数据。

```java
package com.carl.demo;

import com.lmax.disruptor.EventHandler;

/**
 * @description:
 * @author: carl
 * @date: 2026.01.12
 * @Since: 1.0
 */

public class LongEventHandler implements EventHandler<LongEvent> {

    /**
     * @param event      要处理的事件
     * @param sequence   序号
     * @param endOfBatch 是否是这一批的最后一个事件
     * @throws Exception
     */
    @Override
    public void onEvent(LongEvent event, long sequence, boolean endOfBatch) throws Exception {
        System.out.println("接收到的数据：" + event + " 序号：" + sequence + " 是否是这一批的最后一个事件：" + endOfBatch);
    }
}

```





#### 4. 定义事件发布者

​	对于事件发布者这里，有两种方案，一种是通过**Event Publisher/Event Translator**接口来进行事件发布。另一种是**偏底层的通过序号Sequence**来发布事件。

​	注意！！！！

> 官方推荐：**不要**使用偏底层的通过序号发布事件，优先选择使用Event Publisher/Event Translator接口来发布事件。
>
> 因为如果我们使用偏底层的通过序号来发布事件的话，我们必须要记得这个槽位序号一定要进行发布，如果一旦忘记了序号发布则会造成Disruptor的损坏，只能通过重启服务来解决了。



​	使用Event Translator接口来进行事件发布的代码

```java
package com.carl.demo;

import com.lmax.disruptor.EventTranslatorOneArg;
import com.lmax.disruptor.RingBuffer;

/**
 * @description:
 * @author: carl
 * @date: 2026.01.12
 * @Since: 1.0
 */

public class EventSender {
    private final RingBuffer<LongEvent> ringBuffer;

    public EventSender(RingBuffer<LongEvent> ringBuffer) {
        this.ringBuffer = ringBuffer;
    }

    /**
     * 声明一个参数的事件翻译器
     */
    private final static EventTranslatorOneArg<LongEvent, Long> EVENT_TRANSLATOR_ONE_ARG = new EventTranslatorOneArg<LongEvent, Long>() {
        @Override
        public void translateTo(LongEvent event, long sequence, Long arg0) {
            event.setTimeStamp(System.currentTimeMillis());
            event.setSource(arg0);
        }
    };



    /**
     * 发布事件方法
     * @param data
     */
    public void send(Long data) {
        ringBuffer.publishEvent(EVENT_TRANSLATOR_ONE_ARG, data);
    }
    
}

```



​	使用偏底层的通过序号发布事件的代码
```java
package com.carl.demo;

import com.lmax.disruptor.EventTranslatorOneArg;
import com.lmax.disruptor.RingBuffer;

/**
 * @description:
 * @author: carl
 * @date: 2026.01.12
 * @Since: 1.0
 */

public class EventSender {
    private final RingBuffer<LongEvent> ringBuffer;

    public EventSender(RingBuffer<LongEvent> ringBuffer) {
        this.ringBuffer = ringBuffer;
    }


    /**
     * 发布事件方法
     * @param data
     */
    public void send(Long data) {
        long sequence = ringBuffer.next();
        try{
            LongEvent longEvent = ringBuffer.get(sequence);
            longEvent.setSource(data);
        }finally {
            ringBuffer.publish(sequence);
        }
    }

}

```





#### 5. 将上面的步骤串起来

​	下面是一个比较简单的Demo代码

```java
package com.carl.demo;

import com.lmax.disruptor.RingBuffer;
import com.lmax.disruptor.YieldingWaitStrategy;
import com.lmax.disruptor.dsl.Disruptor;
import com.lmax.disruptor.dsl.ProducerType;
import com.lmax.disruptor.util.DaemonThreadFactory;

/**
 * @description:
 * @author: carl
 * @date: 2026.01.12
 * @Since: 1.0
 */

public class App {
    public static void main(String[] args) {
        int bufferSize = 1024;
        LongEventFactory longEventFactory = new LongEventFactory();
        Disruptor<LongEvent> disruptor=new Disruptor<>(longEventFactory,bufferSize, DaemonThreadFactory.INSTANCE, ProducerType.SINGLE,new YieldingWaitStrategy());
        disruptor.handleEventsWith(new LongEventHandler());
        disruptor.start();
        RingBuffer<LongEvent> ringBuffer = disruptor.getRingBuffer();
        EventSender eventSender = new EventSender(ringBuffer);
        for (int i = 0; i < 10; i++) {
            eventSender.send(Long.valueOf(i+1));
            try {
                Thread.sleep(1000);
            } catch (InterruptedException e) {
                throw new RuntimeException(e);
            }
        }
    }
}

```





### 六、高级功能—Handler编排

​	Disruptor中的Handler之间是可以进行**<font color=red>编排</font>**的，比如**串行执行、并行执行、串行并行组合**。下面我就给出我的一个Demo代码来演示了四种编排

#### 1.串行

```java
package com.carl.demo;

import com.lmax.disruptor.RingBuffer;
import com.lmax.disruptor.YieldingWaitStrategy;
import com.lmax.disruptor.dsl.Disruptor;
import com.lmax.disruptor.dsl.EventHandlerGroup;
import com.lmax.disruptor.dsl.ProducerType;
import com.lmax.disruptor.util.DaemonThreadFactory;

import java.io.IOException;

/**
 * @description:
 * @author: carl
 * @date: 2026.01.12
 * @Since: 1.0
 */

public class App {
    public static void main(String[] args) {
        int bufferSize = 1024;
        LongEventFactory longEventFactory = new LongEventFactory();
        Disruptor<LongEvent> disruptor=new Disruptor<>(longEventFactory,bufferSize, DaemonThreadFactory.INSTANCE, ProducerType.SINGLE,new YieldingWaitStrategy());
        // h1-h2串行执行
        disruptor.handleEventsWith(new LongEventHandler()).handleEventsWith(new LongEventHandler2());

        disruptor.handleEventsWith(new LongEventHandler4()).handleEventsWith(new LongEventHandler2(),new LongEventHandler3()).handleEventsWith(new LongEventHandler());


        disruptor.start();
        RingBuffer<LongEvent> ringBuffer = disruptor.getRingBuffer();
        EventSender eventSender = new EventSender(ringBuffer);
        ventSender.send(Long.valueOf(1));
        try {
            System.in.read();
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }
}

```



#### 2.并行

​	这里是h1和h2先并行，然后再串行h3和h4

```java
package com.carl.demo;

import com.lmax.disruptor.RingBuffer;
import com.lmax.disruptor.YieldingWaitStrategy;
import com.lmax.disruptor.dsl.Disruptor;
import com.lmax.disruptor.dsl.EventHandlerGroup;
import com.lmax.disruptor.dsl.ProducerType;
import com.lmax.disruptor.util.DaemonThreadFactory;

import java.io.IOException;

/**
 * @description:
 * @author: carl
 * @date: 2026.01.12
 * @Since: 1.0
 */

public class App {
    public static void main(String[] args) {
        int bufferSize = 1024;
        LongEventFactory longEventFactory = new LongEventFactory();
        Disruptor<LongEvent> disruptor=new Disruptor<>(longEventFactory,bufferSize, DaemonThreadFactory.INSTANCE, ProducerType.SINGLE,new YieldingWaitStrategy());
  
        /**
         * h1
         *   - h3-h4
         * h2
         */
        EventHandlerGroup<LongEvent> group1 = disruptor.handleEventsWith(new LongEventHandler());
        EventHandlerGroup<LongEvent> group2 = disruptor.handleEventsWith(new LongEventHandler2());
        group1.and(group2).handleEventsWith(new LongEventHandler3()).handleEventsWith(new LongEventHandler4());


        disruptor.start();
        RingBuffer<LongEvent> ringBuffer = disruptor.getRingBuffer();
        EventSender eventSender = new EventSender(ringBuffer);
				eventSender.send(Long.valueOf(1));
        try {
            System.in.read();
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }
}

```



​	下面是两个串行分支并行，最后再串行

```java
package com.carl.demo;

import com.lmax.disruptor.RingBuffer;
import com.lmax.disruptor.YieldingWaitStrategy;
import com.lmax.disruptor.dsl.Disruptor;
import com.lmax.disruptor.dsl.EventHandlerGroup;
import com.lmax.disruptor.dsl.ProducerType;
import com.lmax.disruptor.util.DaemonThreadFactory;

import java.io.IOException;

/**
 * @description:
 * @author: carl
 * @date: 2026.01.12
 * @Since: 1.0
 */

public class App {
    public static void main(String[] args) {
        int bufferSize = 1024;
        LongEventFactory longEventFactory = new LongEventFactory();
        Disruptor<LongEvent> disruptor=new Disruptor<>(longEventFactory,bufferSize, DaemonThreadFactory.INSTANCE, ProducerType.SINGLE,new YieldingWaitStrategy());
        /**
         * h1-h2
         *      - h1
         * h3-h4
         *
         */
        EventHandlerGroup<LongEvent> group1 = disruptor.handleEventsWith(new LongEventHandler()).handleEventsWith(new LongEventHandler2());
        EventHandlerGroup<LongEvent> group2 = disruptor.handleEventsWith(new LongEventHandler3()).handleEventsWith(new LongEventHandler4());
        group1.and(group2).handleEventsWith(new LongEventHandler());



        disruptor.start();
        RingBuffer<LongEvent> ringBuffer = disruptor.getRingBuffer();
        EventSender eventSender = new EventSender(ringBuffer);
        eventSender.send(Long.valueOf(1));
        try {
            System.in.read();
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }
}

```



​	下面是先并行再串行

```java
package com.carl.demo;

import com.lmax.disruptor.RingBuffer;
import com.lmax.disruptor.YieldingWaitStrategy;
import com.lmax.disruptor.dsl.Disruptor;
import com.lmax.disruptor.dsl.EventHandlerGroup;
import com.lmax.disruptor.dsl.ProducerType;
import com.lmax.disruptor.util.DaemonThreadFactory;

import java.io.IOException;

/**
 * @description:
 * @author: carl
 * @date: 2026.01.12
 * @Since: 1.0
 */

public class App {
    public static void main(String[] args) {
        int bufferSize = 1024;
        LongEventFactory longEventFactory = new LongEventFactory();
        Disruptor<LongEvent> disruptor=new Disruptor<>(longEventFactory,bufferSize, DaemonThreadFactory.INSTANCE, ProducerType.SINGLE,new YieldingWaitStrategy());
      
        /**
         *   h2
         *h4 -  h1
         *   h3
         */

        disruptor.handleEventsWith(new LongEventHandler4()).handleEventsWith(new LongEventHandler2(),new LongEventHandler3()).handleEventsWith(new LongEventHandler());


        disruptor.start();
        RingBuffer<LongEvent> ringBuffer = disruptor.getRingBuffer();
        EventSender eventSender = new EventSender(ringBuffer);
        eventSender.send(Long.valueOf(1));
        try {
            System.in.read();
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }
}

```




### 七、异常处理

​	在Disruptor中可以自定义异常处理类，只需要**实现ExceptionHandler<?>**。定义好了异常处理类，那么这个异常处理类**既可以用于全局默认异常处理类也可以用于针对某一个特定的handler的异常处理类**。

​	如果针对某一个handler指定了对应的异常处理类，那么会**覆盖**这个handler上的默认异常处理类。



```java
package com.carl.demo;

import com.lmax.disruptor.ExceptionHandler;

/**
 * @description:
 * @author: carl
 * @date: 2026.01.12
 * @Since: 1.0
 */

public class LongEventHandleExceptionHandler implements ExceptionHandler<LongEvent> {
    @Override
    public void handleEventException(Throwable ex, long sequence, LongEvent event) {
        System.out.println("LongEventHandleExceptionHandler 处理事件异常：" + ex + " 序号：" + sequence + " 事件：" + event);
    }

    @Override
    public void handleOnStartException(Throwable ex) {
        System.out.println("LongEventHandleExceptionHandler 启动异常：" + ex);   
    }

    @Override
    public void handleOnShutdownException(Throwable ex) {
        System.out.println("LongEventHandleExceptionHandler 关闭异常：" + ex);
    }
}

```



```java
package com.carl.demo;

import com.lmax.disruptor.RingBuffer;
import com.lmax.disruptor.YieldingWaitStrategy;
import com.lmax.disruptor.dsl.Disruptor;
import com.lmax.disruptor.dsl.ProducerType;
import com.lmax.disruptor.util.DaemonThreadFactory;

import java.io.IOException;

/**
 * @description:
 * @author: carl
 * @date: 2026.01.12
 * @Since: 1.0
 */

public class App {
    public static void main(String[] args) {
        int bufferSize = 1024;
        LongEventFactory longEventFactory = new LongEventFactory();
        Disruptor<LongEvent> disruptor = new Disruptor<>(longEventFactory, bufferSize, DaemonThreadFactory.INSTANCE, ProducerType.SINGLE, new YieldingWaitStrategy());
			  // h1-h2串行执行
        disruptor.handleEventsWith(new LongEventHandler()).handleEventsWith(new LongEventHandler2());
			
        //设置全局handler的异常处理类
        disruptor.setDefaultExceptionHandler(new LongEventHandleExceptionHandler());
        //只适用于LongEventHandler2的异常处理类
        disruptor.handleExceptionsFor(new LongEventHandler2()).with(new LongEventHandleExceptionHandler());
        disruptor.start();
        RingBuffer<LongEvent> ringBuffer = disruptor.getRingBuffer();
        EventSender eventSender = new EventSender(ringBuffer);
        eventSender.send(Long.valueOf(1));
        try {
            System.in.read();
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }
}

```





### 八、原理讲解

​	下面附上一个我从网上找的一个Disruptor的运转图，我会根据这个图来讲解一下Disruptor中，生产者和消费者之间的工作过程是什么。

![Disruptor中Barrier运转图](https://s3.bmp.ovh/imgs/2026/01/12/250b0db48b20a00b.png)

​	首先，事件**生产者Producer是通过Sequencer往RingBuffer中写入数据的**，但是大家肯定会有一个疑问那就是：如果此时的RingBuffer中的数组已经满了，生产者如何继续写入数据，是直接覆盖吗？

​	回答：先回答问题，不会。

​	Disruptor使用Sequencer实现了高效的**背压机制**，不会直接覆盖没有消费的事件。生产者在往RingBuffer中放入数据之前，会去**查询消费者中此时处理的<font color=red>最小的序号</font>**。如果此时生产者通过Sequencer得到的**nextSeq超过了消费者处理的最小的序号+bufferSize的大小**的时候，生产者会根据我们配置的等待策略进行等待，而不是直接进行数据的覆盖。

​	对于事件消费者来说，我前文已经说了，每一个事件消费者都有一个Sequence Barrier和它关联，事件消费者**通过waitFor()方法来获取下一个应该要进行处理的事件的序号**，当处理完这个事件之后会进行**commit把这个事件提交**。



### 九、高级功能—多线程消费

​	在Disruptor中是支持事件消费者多线程消费的，使用起来也很简单，只需要在原来的流程上改动两个地方即可。

​	第一个要改的地方是：**事件Handler要再实现WorkHandler<?>接口**

​	第二个要改的地方就是**在disruptor.start()启动之前定义handleEventsWithWorkerPool()**

```java
package com.carl.demo;

import com.lmax.disruptor.RingBuffer;
import com.lmax.disruptor.YieldingWaitStrategy;
import com.lmax.disruptor.dsl.Disruptor;
import com.lmax.disruptor.dsl.ProducerType;
import com.lmax.disruptor.util.DaemonThreadFactory;

import java.io.IOException;
import java.util.concurrent.BrokenBarrierException;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicLong;

/**
 * @description:
 * @author: carl
 * @date: 2026.01.12
 * @Since: 1.0
 */

public class App {
    public static void main(String[] args) {
        int bufferSize = 1024;
        LongEventFactory longEventFactory = new LongEventFactory();
        Disruptor<LongEvent> disruptor = new Disruptor<>(longEventFactory, bufferSize, DaemonThreadFactory.INSTANCE, ProducerType.MULTI, new YieldingWaitStrategy());
        // h1-h2串行执行
//        disruptor.handleEventsWith(new LongEventHandler()).handleEventsWith(new LongEventHandler2());
//        disruptor.handleEventsWith(new LongEventHandler());
        /**
         * h1
         *   - h3-h4
         * h2
         */
//        EventHandlerGroup<LongEvent> group1 = disruptor.handleEventsWith(new LongEventHandler());
//        EventHandlerGroup<LongEvent> group2 = disruptor.handleEventsWith(new LongEventHandler2());
//        group1.and(group2).handleEventsWith(new LongEventHandler3()).handleEventsWith(new LongEventHandler4());

        /**
         * h1-h2
         *      - h1
         * h3-h4
         *
         */
//        EventHandlerGroup<LongEvent> group1 = disruptor.handleEventsWith(new LongEventHandler()).handleEventsWith(new LongEventHandler2());
//        EventHandlerGroup<LongEvent> group2 = disruptor.handleEventsWith(new LongEventHandler3()).handleEventsWith(new LongEventHandler4());
//        group1.and(group2).handleEventsWith(new LongEventHandler());

        /**
         *   h2
         *h4 -  h1
         *   h3
         */

//        disruptor.handleEventsWith(new LongEventHandler4()).handleEventsWith(new LongEventHandler2(), new LongEventHandler3()).handleEventsWith(new LongEventHandler());

        LongEventHandler[] longEventHandlers=new LongEventHandler[10];
        for (int i = 0; i < 10; i++) {
            longEventHandlers[i]=new LongEventHandler();
        }
        LongEventHandler2[] longEventHandler2s=new LongEventHandler2[5];
        for (int i = 0; i < 5; i++) {
            longEventHandler2s[i]=new LongEventHandler2();
        }
        
        //添加多线程事件消费者
        disruptor.handleEventsWithWorkerPool(longEventHandlers).handleEventsWithWorkerPool(longEventHandler2s);

        //设置全局handler的异常处理类
        disruptor.setDefaultExceptionHandler(new LongEventHandleExceptionHandler());
        //只适用于LongEventHandler2的异常处理类
//        disruptor.handleExceptionsFor(new LongEventHandler2()).with(new LongEventHandleExceptionHandler());
        disruptor.start();
        RingBuffer<LongEvent> ringBuffer = disruptor.getRingBuffer();
        EventSender eventSender = new EventSender(ringBuffer);
        CyclicBarrier cyclicBarrier=new CyclicBarrier(2);
        ExecutorService executorService = Executors.newCachedThreadPool();
        executorService.submit(()->{
            eventSender.send(11L);
            try {
                cyclicBarrier.await();
            } catch (InterruptedException e) {
                throw new RuntimeException(e);
            } catch (BrokenBarrierException e) {
                throw new RuntimeException(e);
            }
        });
        try {
            System.in.read();
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }
}
```



```java
package com.carl.demo;

import com.lmax.disruptor.EventHandler;
import com.lmax.disruptor.WorkHandler;

/**
 * @description:
 * @author: carl
 * @date: 2026.01.12
 * @Since: 1.0
 */

public class LongEventHandler implements EventHandler<LongEvent>, WorkHandler<LongEvent> {

    /**
     * @param event      要处理的事件
     * @param sequence   序号
     * @param endOfBatch 是否是这一批的最后一个事件
     * @throws Exception
     */
    @Override
    public void onEvent(LongEvent event, long sequence, boolean endOfBatch) throws Exception {
        System.out.println(System.currentTimeMillis() +" "+ Thread.currentThread().getName() + " 1接收到的数据：" + event + " 序号：" + sequence + " 是否是这一批的最后一个事件：" + endOfBatch);
        Thread.sleep(1000);
    }

    @Override
    public void onEvent(LongEvent longEvent) throws Exception {
        System.out.println(System.currentTimeMillis()+" "+Thread.currentThread().getName()+" 1接受到消息："+longEvent);
    }
}

```



```java
package com.carl.demo;

import com.lmax.disruptor.EventHandler;
import com.lmax.disruptor.WorkHandler;

/**
 * @description:
 * @author: carl
 * @date: 2026.01.12
 * @Since: 1.0
 */

public class LongEventHandler2 implements EventHandler<LongEvent>, WorkHandler<LongEvent> {

    /**
     * @param event      要处理的事件
     * @param sequence   序号
     * @param endOfBatch 是否是这一批的最后一个事件
     * @throws Exception
     */
    @Override
    public void onEvent(LongEvent event, long sequence, boolean endOfBatch) throws Exception {
        System.out.println(System.currentTimeMillis()+" "+Thread.currentThread().getName() + " 2接收到的数据：" + event + " 序号：" + sequence + " 是否是这一批的最后一个事件：" + endOfBatch);
        Thread.sleep(2000);
    }

    @Override
    public void onEvent(LongEvent longEvent) throws Exception {
        System.out.println(System.currentTimeMillis()+" "+Thread.currentThread().getName() + " 2接收到的数据：" + longEvent);
    }
}

```



> 通过上面的代码我推荐以后的事件处理器**同时实现EventHandler接口WorkHandler接口**,这样可以很方便进行多线程消费的扩展。





### 十、Java线程亲和性组件Affinity

​	这个组件是一个专门针对于Java程序的线程亲和度组件，作用就是**<font color=red>将线程与CPU进行1:1的绑定</font>**。

​	引入依赖：

```xml
<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
  <modelVersion>4.0.0</modelVersion>

  <groupId>com.carl</groupId>
  <artifactId>restudy-disruptor</artifactId>
  <version>1.0</version>
  <packaging>jar</packaging>

  <name>restudy-disruptor</name>
  <url>http://maven.apache.org</url>

  <properties>
    <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
  </properties>

  <dependencies>
    <dependency>
      <groupId>com.lmax</groupId>
      <artifactId>disruptor</artifactId>
      <version>3.4.4</version>
    </dependency>

<!--    Java线程亲和性依赖-->
    <dependency>
      <groupId>net.openhft</groupId>
      <artifactId>affinity</artifactId>
      <version>3.23.3</version>
    </dependency>
  </dependencies>
</project>

```



​	只需要修改Disruptor声明时候的线程工厂就好了

```java
package com.carl.demo;

import com.lmax.disruptor.RingBuffer;
import com.lmax.disruptor.YieldingWaitStrategy;
import com.lmax.disruptor.dsl.Disruptor;
import com.lmax.disruptor.dsl.ProducerType;
import com.lmax.disruptor.util.DaemonThreadFactory;
import net.openhft.affinity.AffinityThreadFactory;

import java.io.IOException;
import java.util.concurrent.BrokenBarrierException;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicLong;

/**
 * @description:
 * @author: carl
 * @date: 2026.01.12
 * @Since: 1.0
 */

public class App {
    public static void main(String[] args) {
        int bufferSize = 1024;
        LongEventFactory longEventFactory = new LongEventFactory();
        //定义Java线程亲和性线程工厂，可以将线程与CPU进行1：1绑定
        AffinityThreadFactory affinityThreadFactory = new AffinityThreadFactory("disruptor-demo-thread:");
        Disruptor<LongEvent> disruptor = new Disruptor<>(longEventFactory, bufferSize, affinityThreadFactory, ProducerType.MULTI, new YieldingWaitStrategy());
        // h1-h2串行执行
//        disruptor.handleEventsWith(new LongEventHandler()).handleEventsWith(new LongEventHandler2());
//        disruptor.handleEventsWith(new LongEventHandler());
        /**
         * h1
         *   - h3-h4
         * h2
         */
//        EventHandlerGroup<LongEvent> group1 = disruptor.handleEventsWith(new LongEventHandler());
//        EventHandlerGroup<LongEvent> group2 = disruptor.handleEventsWith(new LongEventHandler2());
//        group1.and(group2).handleEventsWith(new LongEventHandler3()).handleEventsWith(new LongEventHandler4());

        /**
         * h1-h2
         *      - h1
         * h3-h4
         *
         */
//        EventHandlerGroup<LongEvent> group1 = disruptor.handleEventsWith(new LongEventHandler()).handleEventsWith(new LongEventHandler2());
//        EventHandlerGroup<LongEvent> group2 = disruptor.handleEventsWith(new LongEventHandler3()).handleEventsWith(new LongEventHandler4());
//        group1.and(group2).handleEventsWith(new LongEventHandler());

        /**
         *   h2
         *h4 -  h1
         *   h3
         */

//        disruptor.handleEventsWith(new LongEventHandler4()).handleEventsWith(new LongEventHandler2(), new LongEventHandler3()).handleEventsWith(new LongEventHandler());

        LongEventHandler[] longEventHandlers=new LongEventHandler[10];
        for (int i = 0; i < 10; i++) {
            longEventHandlers[i]=new LongEventHandler();
        }
        LongEventHandler2[] longEventHandler2s=new LongEventHandler2[5];
        for (int i = 0; i < 5; i++) {
            longEventHandler2s[i]=new LongEventHandler2();
        }

        //添加多线程事件消费者
        disruptor.handleEventsWithWorkerPool(longEventHandlers).handleEventsWithWorkerPool(longEventHandler2s);

        //设置全局handler的异常处理类
        disruptor.setDefaultExceptionHandler(new LongEventHandleExceptionHandler());
        //只适用于LongEventHandler2的异常处理类
//        disruptor.handleExceptionsFor(new LongEventHandler2()).with(new LongEventHandleExceptionHandler());
        disruptor.start();
        RingBuffer<LongEvent> ringBuffer = disruptor.getRingBuffer();
        EventSender eventSender = new EventSender(ringBuffer);
        CyclicBarrier cyclicBarrier=new CyclicBarrier(2);
        ExecutorService executorService = Executors.newCachedThreadPool();
        executorService.submit(()->{
            eventSender.send(11L);
            try {
                cyclicBarrier.await();
            } catch (InterruptedException e) {
                throw new RuntimeException(e);
            } catch (BrokenBarrierException e) {
                throw new RuntimeException(e);
            }
        });
        try {
            System.in.read();
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
        Runtime.getRuntime().addShutdownHook(new Thread(()->{
            disruptor.shutdown();
        }));
    }
}
```

​	在Disruptor中使用Affinity的优缺点

> 优点：
>
> 1. **提高缓存命中率（核心优势）**
>
>    **减少缓存失效**：当线程在不同CPU核心间切换时，原核心的缓存（L1/L2/L3）数据会失效。通过**<font color=skyblue>将Disruptor的消费者线程绑定到特定CPU核心</font>**，可以保持缓存热度，显著提升性能。
>
> ​      **与Disruptor的缓存友好设计相辅相成**：Disruptor本身设计为"缓存友好"，使用AffinityThreadFactory能进一步优化这种设计。
>
> 2. **降低延迟波动，提高性能一致性**
>
>    **避免线程迁移带来的延迟**：线程迁移会导致缓存失效和额外的调度开销，使用AffinityThreadFactory可以消除这种不确定性，使系统性能更可预测。
>
>    **符合Disruptor"低延迟、高性能"的定位**：Disruptor设计初衷就是解决内存队列延迟问题，线程亲和性能进一步提升其性能。
>
> 3. **NUMA架构优化**
>
>    **减少远程内存访问**：在NUMA架构服务器上，将线程绑定到与数据所在内存节点相同的CPU核心，可以避免缓慢的远程内存访问。
>
>    **提升多节点系统的性能**：对于多CPU插槽的服务器，可以将线程绑定到特定插槽，减少跨插槽的内存访问。
>
> 4. **与Disruptor的"无锁"设计协同增效**
>
>    **Disruptor通过无锁编程实现高性能，结合线程亲和性，能进一步减少缓存不命中，发挥"无锁+缓存友好"的协同优势**。



> 缺点：
>
> 1. **CPU利用率可能不均衡**
>
>    **固定核心导致负载不均**：如果绑定了特定核心，而其他核心空闲，可能导致**CPU利用率不均衡**，无法充分利用所有CPU核心的计算能力。
>
>    **需要仔细规划**：必须根据实际负载和硬件架构合理配置线程亲和性策略，否则可能适得其反。
>
> 4. **与Disruptor的线程池机制可能冲突**
>
>    **Disruptor的消费者数量与CPU核心数匹配**：如果消费者数量远多于CPU核心数，绑定核心可能导致线程等待。
>
>    **需要合理设置消费者数量**：消费者数量应与CPU核心数匹配，否则可能无法充分利用线程亲和性优势。



​	如果我们的项目中使用了Affinity的话，那么你的**消费者Handler的数量一定要和你的服务器的CPU核心数匹配**，如果你的消费者Handler的**数量非常大**，那么**不建议使用Affinity**。但是如果你的消费者Handler的数量在设计之初就是按照CPU的核心数来设计的，那么使用Affinity可以进一步提高性能，比如我的虚拟货币交易系统就是在设计之初就考虑到了CPU的核心数和消费者Handler之间的关系，所以我使用了Affinity来进一步提高性能。



### 十一、优雅关机

​	在最后这里补充一下Disruptor的优雅关机，很简单就是在Disruptor的定义最后增加一段代码就可以

```java
//当JVM关闭的时候会出发这个关闭钩子，这个钩子会去执行Disruptor的优雅关机
Runtime.getRuntime().addShutdownHook(new Thread(()->{
    		//Disruptor优雅关机，等待所有未处理的事件处理完毕
            disruptor.shutdown();
        }));
```



