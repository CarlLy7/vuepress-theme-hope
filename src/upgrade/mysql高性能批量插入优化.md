---
title: mysql大数据量插入性能优化方案
date: 2023-12-01
icon: jar-wheat
---



## mysql大数据量插入性能优化方案

在业务的开发工程中最常见的就是大数据量的插入了，我目前为止遇到过的最大的数据量是每天40w数据量来进行插入到一个表中。那么对于这种大数据量的插入如果不做优化的话肯定会对系统的性能产生很大的影响。

### 1.sql语句层面的foreach批量插入

#### 比较常见的一种方案就是在xml中的sql语句中使用 foreach 标签来进行sql的拼接，实现的效果就是
```sql
    insert into user(xx,xx,xx) values(xx,xx,xx,xx....) 
```

```sql
"insert into student (name, age, addr, addr_num) values " +
            "<foreach collection='studentList' item='item' separator=','> " +
            "(#{item.name}, #{item.age},#{item.addr}, #{item.addrNum}) " +
            "</foreach> "
```

2. 使用手动提交事务+批处理模式

#### 在大数据量的批量插入中如果我们一条条的插入的话，性能影响很大的部分是获取连接、释放连接、资源关闭上。如果我们使用手动提交事务+批处理模式的话，会大大减少这里的损耗。

注意，mysql默认是没有开启批处理模式的，**如果我们要开启需要在配置文件的url中加上rewriteBatchedStatements=true**

然后关闭自动提交，通过SqlSession的反射机制来获得对应的mapper,然后调用对应的save方法

下面附上对应的demo
```java
@RunWith(SpringRunner.class)
@SpringBootTest
public class UserTest {
    @Resource
    private UserService userService;
    @Autowired
    private SqlSessionFactory sqlSessionFactory;
    @Test
    public void testSaveUser(){
        //使用批量模式，并且关闭自动提交
        SqlSession sqlSession= sqlSessionFactory.openSession(ExecutorType.BATCH,false);
        UserMapper mapper = sqlSession.getMapper(UserMapper.class);
        long startTime = System.currentTimeMillis();
        for (int i = 0; i < 150000; i++) {
            UserEntity userEntity = new UserEntity();
            userEntity.setSex(0);
            userEntity.setName("tom"+i+1);
            mapper.saveUser(userEntity);
        }
        //一次性提交事务
        sqlSession.commit();
        //关闭资源
        sqlSession.close();
        long endTime = System.currentTimeMillis();
        System.out.println("耗时:"+(endTime-startTime));
    }
}
```

#### 3.使用数据分片+多线程（也是我目前在公司使用的方法）

思路： 现将要保存的所有数据放到一个集合中，然后根据你要使用的线程数来对这个集合进行数据分片，数据分片有很多工具类都可以实现，比如hutool和google的工具类都可以简单的实现。然后我使用countDownLatch来进行多线程来批量保存数据，我使用的是在sql语句中通过foreach标签来批量保存。

#### 4.另外的一个优化思路：方案2+方案3

在多线程批量保存的时候使用方案2的方法


  15w数据单线程foreach语句批量处理两次测试耗时： 耗时:5405ms 耗时:5282ms

  15w数据多线程+单个insert但是批量处理两次测试耗时： 耗时:3147ms  耗时:2755ms

  15w数据多线程+批量foreach语句处理两次测试耗时：耗时:4657ms  耗时:6134ms